package main

import (
	"crypto/tls"
	"encoding/base64"
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
	Success      bool        `json:"success"`
	Domain       string      `json:"domain"`
	FaviconURL   string      `json:"faviconUrl"`
	FaviconSize  int         `json:"faviconSize"`
	MMH3Hash     int32       `json:"mmh3Hash"`
	ShodanDork   string      `json:"shodanDork"`
	CensysDork   string      `json:"censysDork"`
	FOFADork     string      `json:"fofaDork"`
	ZoomEyeDork  string      `json:"zoomeyeDork"`
	TechMatch    string      `json:"techMatch,omitempty"`
	Error        string      `json:"error,omitempty"`
}

var knownFavicons = map[int32]string{
	116323821:   "NetScaler Gateway",
	-305179312:  "Apache Tomcat",
	-1293210025: "Apache Default",
	-1166125415: "Apache 2.4",
	1485257654:  "Grafana",
	-1840324437: "GitLab",
	81586312:    "Jenkins",
	-2057558656: "Jenkins (old)",
	-1293291455: "Jira",
	-305190281:  "Confluence",
	-1299055300: "Kibana",
	442749392:   "NGINX Default",
	-1652030880: "WordPress",
	-776236364:  "Microsoft IIS",
	988422585:   "Microsoft Exchange",
	-1022954741: "Outlook Web Access",
	-428788535:  "Fortinet FortiGate",
	-380651196:  "Palo Alto GlobalProtect",
	-1009160441: "SonicWall",
	1820870345:  "Cisco ASA WebVPN",
	1708240443:  "Webmin",
	-1188298005: "cPanel",
	-1345547613: "Plesk",
	-1654571495: "Splunk",
	-537042790:  "Zabbix",
	708578229:   "Nagios",
	1279362976:  "phpMyAdmin",
	-266654373:  "Spring Boot",
	-1032603498: "Ruby on Rails (default)",
	-730242248:  "Traefik",
	247388479:   "MinIO",
	-1550098674: "Harbor (Docker Registry)",
	-2044888391: "Rancher",
	1848946384:  "Kubernetes Dashboard",
	1270949615:  "Elastic APM",
	-157021903:  "Prometheus",
	1061927498:  "AlertManager",
	366273918:   "ArgoCD",
	-1003891096: "SonarQube",
	-1653767739: "Nexus Repository",
	-1507567067: "Artifactory",
}

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 5,
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
	},
	// Allow redirects (many sites redirect favicon to CDN)
}

func main() {
	domain := flag.String("domain", "", "Target domain")
	flag.Parse()

	if *domain == "" {
		fail("Domain is required")
	}

	d := strings.TrimSpace(*domain)
	d = strings.TrimPrefix(d, "http://")
	d = strings.TrimPrefix(d, "https://")
	d = strings.TrimRight(d, "/")

	result := Output{Success: true, Domain: d}

	var faviconData []byte
	var faviconURL string

	// STEP 1: Parse HTML first — most modern sites define favicon in <link> tags
	htmlURL := fmt.Sprintf("https://%s/", d)
	req, _ := http.NewRequest("GET", htmlURL, nil)
	if req != nil {
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
		resp, err := httpClient.Do(req)
		if err == nil {
			htmlBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
			resp.Body.Close()
			html := string(htmlBody)
			iconURL := extractFaviconFromHTML(html, d)
			if iconURL != "" {
				req2, _ := http.NewRequest("GET", iconURL, nil)
				if req2 != nil {
					req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
					resp2, err2 := httpClient.Do(req2)
					if err2 == nil {
						body2, _ := io.ReadAll(io.LimitReader(resp2.Body, 2*1024*1024))
						resp2.Body.Close()
						if resp2.StatusCode == 200 && len(body2) > 0 {
							faviconData = body2
							faviconURL = iconURL
						}
					}
				}
			}
		}
	}

	// STEP 2: Fall back to common direct paths
	if faviconData == nil {
		faviconPaths := []string{
			fmt.Sprintf("https://%s/favicon.ico", d),
			fmt.Sprintf("https://%s/favicon.png", d),
			fmt.Sprintf("https://%s/favicon.svg", d),
			fmt.Sprintf("https://%s/apple-touch-icon.png", d),
			fmt.Sprintf("https://%s/apple-touch-icon-precomposed.png", d),
			fmt.Sprintf("https://%s/static/favicon.ico", d),
			fmt.Sprintf("https://%s/assets/favicon.ico", d),
			fmt.Sprintf("https://%s/images/favicon.ico", d),
			fmt.Sprintf("https://%s/img/favicon.ico", d),
			fmt.Sprintf("http://%s/favicon.ico", d),
		}

		for _, url := range faviconPaths {
			req, err := http.NewRequest("GET", url, nil)
			if err != nil { continue }
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

			resp, err := httpClient.Do(req)
			if err != nil { continue }
			body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
			resp.Body.Close()
			if err != nil { continue }

			if resp.StatusCode == 200 && len(body) > 100 {
				// Verify it's not an HTML error page
				prefix := strings.ToLower(string(body[:min(200, len(body))]))
				if !strings.Contains(prefix, "<html") && !strings.Contains(prefix, "<!doctype") {
					faviconData = body
					faviconURL = url
					break
				}
			}
		}
	}

	if faviconData == nil {
		fail("No favicon found for " + d)
	}

	// Calculate MMH3 hash (Shodan method)
	// CRITICAL: Must match Python's base64.encodebytes() which wraps at 76 chars with \n
	b64Raw := base64.StdEncoding.EncodeToString(faviconData)
	var b64Builder strings.Builder
	for i := 0; i < len(b64Raw); i += 76 {
		end := i + 76
		if end > len(b64Raw) { end = len(b64Raw) }
		b64Builder.WriteString(b64Raw[i:end])
		b64Builder.WriteByte('\n')
	}
	b64 := b64Builder.String()
	hash := murmurHash3([]byte(b64), 0)

	result.FaviconURL = faviconURL
	result.FaviconSize = len(faviconData)
	result.MMH3Hash = hash
	result.ShodanDork = fmt.Sprintf("http.favicon.hash:%d", hash)
	result.CensysDork = fmt.Sprintf("web.endpoints.http.favicons.hash_shodan: \"%d\"", hash)
	result.FOFADork = fmt.Sprintf("icon_hash=\"%d\"", hash)
	result.ZoomEyeDork = fmt.Sprintf("iconhash:\"%d\"", hash)

	// Check known technologies
	if tech, ok := knownFavicons[hash]; ok {
		result.TechMatch = tech
	}

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func fail(msg string) {
	out, _ := json.Marshal(Output{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

func extractFaviconFromHTML(html, domain string) string {
	lower := strings.ToLower(html)

	// Look for all favicon-related link tags
	patterns := []string{
		`rel="icon"`,
		`rel="shortcut icon"`,
		`rel='icon'`,
		`rel='shortcut icon'`,
		`rel="apple-touch-icon"`,
		`rel="apple-touch-icon-precomposed"`,
		`rel="mask-icon"`,
	}

	for _, pattern := range patterns {
		idx := strings.Index(lower, pattern)
		if idx == -1 { continue }

		// Search around this position for href
		start := idx - 200
		if start < 0 { start = 0 }
		end := idx + 200
		if end > len(html) { end = len(html) }
		snippet := html[start:end]

		hrefIdx := strings.Index(strings.ToLower(snippet), "href=")
		if hrefIdx == -1 { continue }

		snippet = snippet[hrefIdx+5:]
		quote := snippet[0]
		if quote != '"' && quote != '\'' { continue }
		snippet = snippet[1:]
		endQuote := strings.IndexByte(snippet, quote)
		if endQuote == -1 { continue }

		href := snippet[:endQuote]

		// Make absolute URL
		if strings.HasPrefix(href, "//") {
			return "https:" + href
		} else if strings.HasPrefix(href, "/") {
			return fmt.Sprintf("https://%s%s", domain, href)
		} else if strings.HasPrefix(href, "http") {
			return href
		} else {
			return fmt.Sprintf("https://%s/%s", domain, href)
		}
	}

	return ""
}

// MurmurHash3 32-bit implementation (same as Python mmh3.hash)
func murmurHash3(data []byte, seed uint32) int32 {
	length := len(data)
	nblocks := length / 4

	var h1 uint32 = seed
	const c1 uint32 = 0xcc9e2d51
	const c2 uint32 = 0x1b873593

	// Body
	for i := 0; i < nblocks; i++ {
		k1 := uint32(data[i*4]) | uint32(data[i*4+1])<<8 | uint32(data[i*4+2])<<16 | uint32(data[i*4+3])<<24

		k1 *= c1
		k1 = (k1 << 15) | (k1 >> 17)
		k1 *= c2

		h1 ^= k1
		h1 = (h1 << 13) | (h1 >> 19)
		h1 = h1*5 + 0xe6546b64
	}

	// Tail
	tail := data[nblocks*4:]
	var k1 uint32
	switch len(tail) {
	case 3:
		k1 ^= uint32(tail[2]) << 16
		fallthrough
	case 2:
		k1 ^= uint32(tail[1]) << 8
		fallthrough
	case 1:
		k1 ^= uint32(tail[0])
		k1 *= c1
		k1 = (k1 << 15) | (k1 >> 17)
		k1 *= c2
		h1 ^= k1
	}

	// Finalization
	h1 ^= uint32(length)
	h1 ^= h1 >> 16
	h1 *= 0x85ebca6b
	h1 ^= h1 >> 13
	h1 *= 0xc2b2ae35
	h1 ^= h1 >> 16

	return int32(h1)
}

func min(a, b int) int {
	if a < b { return a }
	return b
}
