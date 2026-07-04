package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Subdomain Enum Sources

func fetchCrtSh(domain string) []string {
	client := &http.Client{Timeout: 45 * time.Second}
	url := fmt.Sprintf("https://crt.sh/?q=%%25.%s&output=json", domain)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := client.Do(req)
	if err != nil { return nil }
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var entries []CrtShEntry
	json.Unmarshal(body, &entries)

	var subs []string
	for _, e := range entries {
		for _, n := range strings.Split(e.NameValue, "\n") {
			n = strings.TrimSpace(strings.ToLower(n))
			n = strings.TrimPrefix(n, "*.")
			if n != "" && n != domain && strings.HasSuffix(n, "."+domain) {
				subs = append(subs, n)
			}
		}
	}
	return subs
}

func fetchHackerTarget(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://api.hackertarget.com/hostsearch/?q=%s", domain))
	if err != nil { return nil }
	var subs []string
	for _, line := range strings.Split(body, "\n") {
		parts := strings.Split(line, ",")
		if len(parts) > 0 {
			subs = append(subs, strings.TrimSpace(parts[0]))
		}
	}
	return subs
}

func fetchAlienVault(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://otx.alienvault.com/api/v1/indicators/domain/%s/passive_dns", domain))
	if err != nil { return nil }
	var result struct {
		PassiveDNS []struct {
			Hostname string `json:"hostname"`
		} `json:"passive_dns"`
	}
	json.Unmarshal([]byte(body), &result)
	var subs []string
	for _, record := range result.PassiveDNS {
		subs = append(subs, record.Hostname)
	}
	return subs
}

func fetchURLScan(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://urlscan.io/api/v1/search/?q=domain:%s", domain))
	if err != nil { return nil }
	var result struct {
		Results []struct {
			Page struct {
				Domain string `json:"domain"`
			} `json:"page"`
		} `json:"results"`
	}
	json.Unmarshal([]byte(body), &result)
	var subs []string
	for _, res := range result.Results {
		if res.Page.Domain != "" { subs = append(subs, res.Page.Domain) }
	}
	return subs
}

func fetchThreatCrowd(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://www.threatcrowd.org/searchApi/v2/domain/report/?domain=%s", domain))
	if err != nil { return nil }
	var result struct {
		Subdomains []string `json:"subdomains"`
	}
	json.Unmarshal([]byte(body), &result)
	return result.Subdomains
}

func fetchRapidDNS(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://rapiddns.io/subdomain/%s", domain))
	if err != nil { return nil }
	// Simple regex extract since it's HTML
	re := regexp.MustCompile(`(?i)>(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+` + regexp.QuoteMeta(domain) + `<`)
	matches := re.FindAllString(body, -1)
	var subs []string
	for _, m := range matches {
		subs = append(subs, strings.TrimSuffix(strings.TrimPrefix(m, ">"), "<"))
	}
	return subs
}

func fetchAnubis(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://jldc.me/anubis/subdomains/%s", domain))
	if err != nil { return nil }
	var subs []string
	json.Unmarshal([]byte(body), &subs)
	return subs
}

func fetchWayback(domain string) []string {
	url := fmt.Sprintf("https://web.archive.org/cdx/search/cdx?url=*.%s/*&output=json&fl=original&collapse=urlkey&limit=5000", domain)
	body, err := httpGet(url)
	if err != nil { return nil }

	var rows [][]string
	json.Unmarshal([]byte(body), &rows)

	var urls []string
	for i, row := range rows {
		if i == 0 || len(row) == 0 { continue }
		u := row[0]
		urls = append(urls, u)
	}
	return urls
}

// Intel Modules

func getGeoInfo(ip string) *GeoInfo {
	body, err := httpGet(fmt.Sprintf("http://ip-api.com/json/%s", ip))
	if err != nil { return nil }
	var geo struct {
		Status  string `json:"status"`
		Country string `json:"country"`
		Region  string `json:"regionName"`
		City    string `json:"city"`
		ISP     string `json:"isp"`
		Org     string `json:"org"`
		AS      string `json:"as"`
	}
	json.Unmarshal([]byte(body), &geo)
	if geo.Status != "success" { return nil }
	return &GeoInfo{
		IP: ip, Country: geo.Country, Region: geo.Region, City: geo.City,
		ISP: geo.ISP, Org: geo.Org, AS: geo.AS,
	}
}

func getReverseIP(domain string) []string {
	body, err := httpGet(fmt.Sprintf("https://api.hackertarget.com/reverseiplookup/?q=%s", domain))
	if err != nil || strings.Contains(body, "error") || strings.Contains(body, "No DNS") { return nil }
	var domains []string
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if line != "" { domains = append(domains, line) }
	}
	return domains
}

func checkSecurityHeaders(domain string) []HeaderCheck {
	client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
	resp, err := client.Get("https://" + domain)
	if err != nil { return nil }
	defer resp.Body.Close()

	headers := []struct {
		Key      string
		Severity string
	}{
		{"Strict-Transport-Security", "High"},
		{"Content-Security-Policy", "High"},
		{"X-Frame-Options", "Medium"},
		{"X-Content-Type-Options", "Medium"},
		{"Permissions-Policy", "Low"},
	}

	var results []HeaderCheck
	for _, h := range headers {
		val := resp.Header.Get(h.Key)
		results = append(results, HeaderCheck{
			Name:     h.Key,
			Present:  val != "",
			Value:    val,
			Severity: h.Severity,
		})
	}
	return results
}

func getSSLInfo(domain string) *SSLInfo {
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 10 * time.Second}, "tcp", domain+":443", &tls.Config{InsecureSkipVerify: true})
	if err != nil { return nil }
	defer conn.Close()
	
	state := conn.ConnectionState()
	if len(state.PeerCertificates) == 0 { return nil }
	cert := state.PeerCertificates[0]

	proto := "TLS"
	switch state.Version {
	case tls.VersionTLS10: proto = "TLS 1.0"
	case tls.VersionTLS11: proto = "TLS 1.1"
	case tls.VersionTLS12: proto = "TLS 1.2"
	case tls.VersionTLS13: proto = "TLS 1.3"
	}

	return &SSLInfo{
		Issuer:    cert.Issuer.CommonName,
		Subject:   cert.Subject.CommonName,
		SANs:      cert.DNSNames,
		NotBefore: cert.NotBefore.Format(time.RFC3339),
		NotAfter:  cert.NotAfter.Format(time.RFC3339),
		Protocol:  proto,
		Serial:    cert.SerialNumber.String(),
	}
}

func getWhois(domain string) *WhoisInfo {
	out, err := exec.Command("whois", domain).Output()
	if err != nil { return nil }
	
	body := string(out)
	whois := &WhoisInfo{}
	
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		lower := strings.ToLower(line)
		
		if strings.HasPrefix(lower, "registrar:") && whois.Registrar == "" {
			whois.Registrar = extractWhoisVal(line)
		} else if (strings.HasPrefix(lower, "creation date:") || strings.HasPrefix(lower, "created:")) && whois.CreatedDate == "" {
			whois.CreatedDate = extractWhoisVal(line)
		} else if (strings.HasPrefix(lower, "registry expiry date:") || strings.HasPrefix(lower, "expiry date:")) && whois.ExpiryDate == "" {
			whois.ExpiryDate = extractWhoisVal(line)
		} else if strings.HasPrefix(lower, "name server:") {
			whois.NameServers = append(whois.NameServers, extractWhoisVal(line))
		} else if strings.HasPrefix(lower, "registrant organization:") && whois.Org == "" {
			whois.Org = extractWhoisVal(line)
		} else if strings.HasPrefix(lower, "registrant country:") && whois.Country == "" {
			whois.Country = extractWhoisVal(line)
		}
	}
	return whois
}

func extractWhoisVal(line string) string {
	parts := strings.SplitN(line, ":", 2)
	if len(parts) == 2 {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

func runNmap(domain string) []PortResult {
	// Runs nmap on all ports with extreme service detection, OS detection, and default scripts
	out, err := exec.Command("nmap", "-A", "-T4", "-p-", "-oG", "-", domain).Output()
	if err != nil { return nil }
	
	body := string(out)
	var ports []PortResult
	
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		if strings.Contains(line, "Ports:") {
			// Extract ports string
			idx := strings.Index(line, "Ports:")
			portsStr := strings.TrimSpace(line[idx+6:])
			portEntries := strings.Split(portsStr, ",")
			
			for _, entry := range portEntries {
				entry = strings.TrimSpace(entry)
				parts := strings.Split(entry, "/")
				if len(parts) >= 5 {
					port := 0
					fmt.Sscanf(parts[0], "%d", &port)
					state := parts[1]
					service := parts[4]
					if len(parts) >= 7 && parts[6] != "" {
						service = service + " - " + parts[6]
					}
					if service == "" && portServiceMap[port] != "" {
						service = portServiceMap[port]
					}
					if state == "open" {
						ports = append(ports, PortResult{
							Port:    port,
							State:   state,
							Service: service,
						})
					}
				}
			}
		}
	}
	return ports
}

func probeSubdomains(subs []string) []SubdomainInfo {
	var results []SubdomainInfo
	var mu sync.Mutex
	sem := make(chan struct{}, 30) // higher concurrency
	var wg sync.WaitGroup

	probeClient := &http.Client{
		Timeout: 6 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			DialContext:     (&net.Dialer{Timeout: 4 * time.Second}).DialContext,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, sub := range subs {
		wg.Add(1)
		go func(s string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			info := SubdomainInfo{Name: s}

			cname, err := net.LookupCNAME(s)
			dnsFails := false
			if err != nil { dnsFails = true }
			if err == nil {
				cname = strings.TrimSuffix(strings.ToLower(cname), ".")
				if cname != s {
					info.CNAME = cname
					for svc, patterns := range takeoverCNAME {
						for _, p := range patterns {
							if strings.Contains(cname, p) {
								info.Takeover = true
								info.TakeoverSvc = svc + " (CNAME)"
								info.Confidence = "LOW"
								_, lookupErr := net.LookupHost(s)
								if lookupErr != nil {
									info.Confidence = "MEDIUM"
								}
								break
							}
						}
						if info.Takeover { break }
					}
				}
			}

			// HTTP probe
			for _, scheme := range []string{"https://", "http://"} {
				req, _ := http.NewRequest("GET", scheme+s, nil)
				req.Header.Set("User-Agent", "Mozilla/5.0")
				resp, err := probeClient.Do(req)
				if err != nil { continue }
				body, _ := io.ReadAll(io.LimitReader(resp.Body, 100*1024))
				resp.Body.Close()
				info.Status = resp.StatusCode
				info.StatusText = http.StatusText(resp.StatusCode)

				bodyStr := string(body)
				for svc, fingerprint := range takeoverBodyFingerprints {
					if strings.Contains(bodyStr, fingerprint) {
						info.Takeover = true
						info.TakeoverSvc = svc + " (HTTP)"
						if dnsFails || info.CNAME != "" {
							info.Confidence = "HIGH"
						} else {
							info.Confidence = "MEDIUM"
						}
						break
					}
				}
				break
			}

			mu.Lock()
			results = append(results, info)
			mu.Unlock()
		}(sub)
	}
	wg.Wait()
	return results
}

func httpGet(url string) (string, error) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := httpClient.Do(req)
	if err != nil { return "", err }
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	return string(body), nil
}

func getDNSRecords(domain string) DNSRecords {
	var records DNSRecords
	
	// A & AAAA
	ips, _ := net.LookupIP(domain)
	for _, ip := range ips {
		if ip.To4() != nil {
			records.A = append(records.A, ip.String())
		} else {
			records.AAAA = append(records.AAAA, ip.String())
		}
	}
	
	// MX
	mxs, _ := net.LookupMX(domain)
	for _, mx := range mxs {
		records.MX = append(records.MX, MXRecord{Host: mx.Host, Pref: mx.Pref})
	}
	
	// NS
	nss, _ := net.LookupNS(domain)
	for _, ns := range nss {
		records.NS = append(records.NS, ns.Host)
	}
	
	// TXT
	txts, _ := net.LookupTXT(domain)
	records.TXT = txts
	
	// CNAME
	cname, _ := net.LookupCNAME(domain)
	if cname != domain {
		records.CNAME = cname
	}
	
	return records
}

func detectWAF(domain string) *WAFInfo {
	req, _ := http.NewRequest("GET", "https://"+domain, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := httpClient.Do(req)
	if err != nil { return nil }
	defer resp.Body.Close()
	
	wafMap := map[string]string{
		"cloudflare": "Cloudflare",
		"awselb": "AWS Web Application Firewall",
		"akamai": "Akamai",
		"sucuri": "Sucuri",
		"imperva": "Imperva Incapsula",
		"f5": "F5 BIG-IP",
		"fastly": "Fastly",
	}
	
	server := strings.ToLower(resp.Header.Get("Server"))
	for k, v := range wafMap {
		if strings.Contains(server, k) {
			return &WAFInfo{Detected: true, Name: v}
		}
	}
	
	// Check headers
	if resp.Header.Get("cf-ray") != "" { return &WAFInfo{Detected: true, Name: "Cloudflare"} }
	if resp.Header.Get("x-amz-cf-id") != "" { return &WAFInfo{Detected: true, Name: "AWS CloudFront"} }
	if resp.Header.Get("x-sucuri-id") != "" { return &WAFInfo{Detected: true, Name: "Sucuri"} }
	
	return &WAFInfo{Detected: false, Name: "No WAF Detected"}
}

func findBuckets(domain string) []BucketInfo {
	var buckets []BucketInfo
	base := strings.Split(domain, ".")[0]
	permutations := []string{base, base + "-assets", base + "-media", base + "-dev", base + "-prod", base + "-public", base + "-static"}
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	for _, p := range permutations {
		wg.Add(1)
		go func(bucket string) {
			defer wg.Done()
			url := "https://" + bucket + ".s3.amazonaws.com"
			req, _ := http.NewRequest("GET", url, nil) // Changed to GET to check permissions
			resp, err := httpClient.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode != 404 {
					isPublic := false
					if resp.StatusCode == 200 {
						body, _ := io.ReadAll(io.LimitReader(resp.Body, 5*1024))
						if strings.Contains(string(body), "<ListBucketResult") {
							isPublic = true
						}
					}
					mu.Lock()
					buckets = append(buckets, BucketInfo{URL: bucket + ".s3.amazonaws.com", IsPublic: isPublic})
					mu.Unlock()
				}
			}
		}(p)
	}
	wg.Wait()
	return buckets
}

func getFaviconHash(domain string) string {
	// Simple MD5 or just existence for now, calculating mmh3 in go requires porting
	req, _ := http.NewRequest("GET", "https://"+domain+"/favicon.ico", nil)
	resp, err := httpClient.Do(req)
	if err != nil || resp.StatusCode != 200 { return "" }
	defer resp.Body.Close()
	return "Favicon Found (Status 200)"
}

func extractJSFiles(domain string) []JSFileInfo {
	body, err := httpGet("https://" + domain)
	if err != nil { return nil }
	
	jsRe := regexp.MustCompile(`(?i)src=["']([^"']+\.js)["']`)
	matches := jsRe.FindAllStringSubmatch(body, -1)
	
	var jsFiles []JSFileInfo
	seen := map[string]bool{}
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	
	for _, m := range matches {
		if len(m) > 1 {
			jsPath := m[1]
			if !seen[jsPath] {
				seen[jsPath] = true
				wg.Add(1)
				go func(jsUrl string) {
					defer wg.Done()
					fullUrl := jsUrl
					if !strings.HasPrefix(fullUrl, "http") {
						if strings.HasPrefix(fullUrl, "/") {
							fullUrl = "https://" + domain + fullUrl
						} else {
							fullUrl = "https://" + domain + "/" + fullUrl
						}
					}
					
					// Download JS and analyze
					jsBody, jsErr := httpGet(fullUrl)
					if jsErr != nil { return }
					
					// Regex for API endpoints
					epRe := regexp.MustCompile(`(?i)(?:api/v[0-9]/|/graphql)[a-zA-Z0-9_\-/?=]+`)
					epMatches := epRe.FindAllString(jsBody, -1)
					
					// Regex for secrets
					secRe := regexp.MustCompile(`(?i)(?:bearer\s+[a-zA-Z0-9\-\._~+/]+=*|AKIA[0-9A-Z]{16})`)
					secMatches := secRe.FindAllString(jsBody, -1)
					
					var eps, secs []string
					epMap := map[string]bool{}
					for _, ep := range epMatches {
						if !epMap[ep] { epMap[ep] = true; eps = append(eps, ep) }
					}
					secMap := map[string]bool{}
					for _, s := range secMatches {
						if !secMap[s] { secMap[s] = true; secs = append(secs, s) }
					}
					
					mu.Lock()
					jsFiles = append(jsFiles, JSFileInfo{URL: jsUrl, Endpoints: eps, Secrets: secs})
					mu.Unlock()
				}(jsPath)
			}
		}
	}
	wg.Wait()
	return jsFiles
}

func huntExposures(domain string) []ExposureInfo {
	paths := map[string]string{
		"/.env": "Environment Variables",
		"/.git/config": "Git Repository",
		"/server-status": "Apache Server Status",
		"/.ssh/id_rsa": "SSH Private Key",
		"/phpinfo.php": "PHP Info",
		"/config.json": "Config File",
	}
	var results []ExposureInfo
	var wg sync.WaitGroup
	var mu sync.Mutex
	
	for path, desc := range paths {
		wg.Add(1)
		go func(p, d string) {
			defer wg.Done()
			req, _ := http.NewRequest("GET", "https://"+domain+p, nil)
			resp, err := httpClient.Do(req)
			if err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == 200 {
					body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
					bodyStr := string(body)
					// Simple false positive check: Make sure it's not a generic 404 disguised as 200
					if !strings.Contains(strings.ToLower(bodyStr), "<html") && len(bodyStr) > 0 {
						mu.Lock()
						results = append(results, ExposureInfo{URL: p, Type: d, Status: 200})
						mu.Unlock()
					}
				}
			}
		}(path, desc)
	}
	wg.Wait()
	return results
}

func fetchWaybackURLs(domain string) []string {
	url := fmt.Sprintf("http://web.archive.org/cdx/search/cdx?url=*.%s/*&output=json&fl=original&collapse=urlkey&limit=500", domain)
	body, err := httpGet(url)
	if err != nil { return nil }
	
	var cdx [][]string
	if err := json.Unmarshal([]byte(body), &cdx); err != nil { return nil }
	
	var urls []string
	for i, row := range cdx {
		if i == 0 { continue } // skip header
		if len(row) > 0 {
			urls = append(urls, row[0])
		}
	}
	return urls
}
