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
	"regexp"
	"strings"
	"sync"
	"time"
)

type Output struct {
	Success    bool          `json:"success"`
	Domain     string        `json:"domain"`
	Emails     []string      `json:"emails"`
	Subdomains []SubdomainInfo `json:"subdomains"`
	URLs       []string      `json:"urls"`
	DNS        DNSRecords    `json:"dns"`
	Socials    []Social      `json:"socials"`
	RobotsTxt  []string      `json:"robotsTxt"`
	Sitemap    []string      `json:"sitemap"`
	TechStack  []string      `json:"techStack"`
	Error      string        `json:"error,omitempty"`
}

type SubdomainInfo struct {
	Name       string `json:"name"`
	Status     int    `json:"status"`
	StatusText string `json:"statusText"`
	CNAME      string `json:"cname,omitempty"`
	Takeover   bool   `json:"takeover"`
	TakeoverSvc string `json:"takeoverSvc,omitempty"`
}

type DNSRecords struct {
	A     []string   `json:"a"`
	AAAA  []string   `json:"aaaa"`
	MX    []MXRecord `json:"mx"`
	NS    []string   `json:"ns"`
	TXT   []string   `json:"txt"`
	CNAME string     `json:"cname"`
}

type MXRecord struct {
	Host string `json:"host"`
	Pref uint16 `json:"pref"`
}

type Social struct {
	Platform string `json:"platform"`
	URL      string `json:"url"`
}

type CrtShEntry struct {
	NameValue string `json:"name_value"`
}

// CNAME-based takeover fingerprints
var takeoverCNAME = map[string][]string{
	"GitHub Pages":   {"github.io"},
	"Heroku":         {"herokuapp.com", "herokussl.com", "herokudns.com"},
	"AWS S3":         {"s3.amazonaws.com", "s3-website"},
	"AWS CloudFront": {"cloudfront.net"},
	"Azure":          {"azurewebsites.net", "cloudapp.net", "azure-api.net", "azurefd.net", "blob.core.windows.net", "trafficmanager.net"},
	"Shopify":        {"myshopify.com"},
	"Tumblr":         {"tumblr.com"},
	"WordPress.com":  {"wordpress.com"},
	"Pantheon":       {"pantheonsite.io"},
	"Fastly":         {"fastly.net"},
	"Zendesk":        {"zendesk.com"},
	"Unbounce":       {"unbouncepages.com"},
	"Cargo":          {"cargocollective.com"},
	"Ghost":          {"ghost.io"},
	"Surge.sh":       {"surge.sh"},
	"Bitbucket":      {"bitbucket.io"},
	"Netlify":        {"netlify.app", "netlify.com"},
	"Vercel":         {"vercel.app", "now.sh"},
	"Fly.io":         {"fly.dev"},
	"Render":         {"onrender.com"},
	"Agile CRM":     {"agilecrm.com"},
	"Airee":          {"arecord.airee.com"},
	"Anima":          {"animaapp.io"},
	"Bigcartel":      {"bigcartel.com"},
	"Campaign Monitor": {"createsend.com"},
	"Desk":           {"desk.com"},
	"Freshdesk":      {"freshdesk.com"},
	"Helpjuice":      {"helpjuice.com"},
	"Helpscout":      {"helpscoutdocs.com"},
	"Intercom":       {"custom.intercom.help"},
	"JetBrains":      {"youtrack.cloud"},
	"Kinsta":         {"kinsta.cloud"},
	"LaunchRock":     {"launchrock.com"},
	"Readme":         {"readme.io"},
	"SmartJobBoard":  {"smartjobboard.com"},
	"StatusPage":     {"statuspage.io"},
	"Strikingly":     {"s.strikinglydns.com"},
	"Tave":           {"clientaccess.tave.com"},
	"TeamWork":       {"teamwork.com"},
	"Tictail":        {"tictail.com"},
	"Uberflip":       {"read.uberflip.com"},
	"UserVoice":      {"uservoice.com"},
	"Webflow":        {"proxy.webflow.com", "proxy-ssl.webflow.com"},
	"Wix":            {"wixdns.net"},
}

// HTTP body fingerprints for confirmed takeover
var takeoverBodyFingerprints = map[string]string{
	"GitHub Pages":   "There isn't a GitHub Pages site here",
	"Heroku":         "No such app",
	"AWS S3":         "NoSuchBucket",
	"Shopify":        "Sorry, this shop is currently unavailable",
	"Tumblr":         "There's nothing here",
	"WordPress.com":  "Do you want to register",
	"Pantheon":       "404 error unknown site",
	"Fastly":         "Fastly error: unknown domain",
	"Zendesk":        "Help Center Closed",
	"Ghost":          "The thing you were looking for is no longer here",
	"Surge.sh":       "project not found",
	"Bitbucket":      "Repository not found",
	"Netlify":        "Not Found - Request ID",
	"Unbounce":       "The requested URL was not found",
	"Strikingly":     "page not found",
	"LaunchRock":     "It looks like you may have taken a wrong turn",
	"Webflow":        "The page you are looking for doesn't exist",
	"Freshdesk":      "May be this is still fresh",
	"Helpjuice":      "We could not find what you're looking for",
	"Helpscout":      "No settings were found for this company",
	"StatusPage":     "You are being <a href",
	"UserVoice":      "This UserVoice subdomain is currently available",
	"Cargo":          "If you're moving your domain away from Cargo",
	"Campaign Monitor": "Double check the URL",
	"Agile CRM":     "Sorry, this page is no longer available",
	"Kinsta":         "No Site For Domain",
	"Readme":         "Project doesnt exist",
	"Azure":          "404 Web Site not found",
}

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		DialContext: (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

func main() {
	domain := flag.String("domain", "", "Target domain")
	flag.Parse()

	if *domain == "" {
		fail("Domain is required")
		return
	}

	d := cleanDomain(*domain)
	result := Output{Success: true, Domain: d}
	var wg sync.WaitGroup
	var mu sync.Mutex

	emailSet := map[string]bool{}
	subdomainSet := map[string]bool{}
	urlSet := map[string]bool{}

	// 1. Scrape website
	wg.Add(1)
	go func() {
		defer wg.Done()
		emails, socials, tech := scrapeWebsite(d)
		mu.Lock()
		for _, e := range emails { emailSet[strings.ToLower(e)] = true }
		result.Socials = socials
		result.TechStack = tech
		mu.Unlock()
	}()

	// 2. crt.sh subdomains
	wg.Add(1)
	go func() {
		defer wg.Done()
		subs := fetchCrtSh(d)
		mu.Lock()
		for _, s := range subs { subdomainSet[s] = true }
		mu.Unlock()
	}()

	// 3. DNS
	wg.Add(1)
	go func() {
		defer wg.Done()
		dns := lookupDNS(d)
		mu.Lock()
		result.DNS = dns
		mu.Unlock()
	}()

	// 4. Wayback
	wg.Add(1)
	go func() {
		defer wg.Done()
		urls := fetchWayback(d)
		mu.Lock()
		for _, u := range urls { urlSet[u] = true }
		mu.Unlock()
	}()

	// 5. robots.txt
	wg.Add(1)
	go func() {
		defer wg.Done()
		paths := fetchRobotsTxt(d)
		mu.Lock()
		result.RobotsTxt = paths
		mu.Unlock()
	}()

	// 6. sitemap.xml
	wg.Add(1)
	go func() {
		defer wg.Done()
		pages := fetchSitemap(d)
		mu.Lock()
		result.Sitemap = pages
		mu.Unlock()
	}()

	wg.Wait()

	// Convert sets
	for e := range emailSet { result.Emails = append(result.Emails, e) }
	for u := range urlSet { result.URLs = append(result.URLs, u) }

	// Probe subdomains (parallel, max 20 concurrent)
	var subList []string
	for s := range subdomainSet { subList = append(subList, s) }

	result.Subdomains = probeSubdomains(subList)

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func cleanDomain(d string) string {
	d = strings.TrimSpace(d)
	d = strings.TrimPrefix(d, "http://")
	d = strings.TrimPrefix(d, "https://")
	d = strings.TrimSuffix(d, "/")
	return strings.Split(d, "/")[0]
}

func fail(msg string) {
	out, _ := json.Marshal(Output{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

func httpGet(url string) (string, error) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	resp, err := httpClient.Do(req)
	if err != nil { return "", err }
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024)) // limit 2MB
	return string(body), nil
}

func probeSubdomains(subs []string) []SubdomainInfo {
	var results []SubdomainInfo
	var mu sync.Mutex
	sem := make(chan struct{}, 20) // concurrency limit
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

			// Check CNAME for takeover
			cname, err := net.LookupCNAME(s)
			if err == nil {
				cname = strings.TrimSuffix(strings.ToLower(cname), ".")
				if cname != s {
					info.CNAME = cname
					for svc, patterns := range takeoverCNAME {
						for _, p := range patterns {
							if strings.Contains(cname, p) {
								_, lookupErr := net.LookupHost(s)
								if lookupErr != nil {
									info.Takeover = true
									info.TakeoverSvc = svc + " (DNS)"
								}
								break
							}
						}
						if info.Takeover { break }
					}
				}
			}

			// HTTP probe + body fingerprint check
			for _, scheme := range []string{"https://", "http://"} {
				req, _ := http.NewRequest("GET", scheme+s, nil)
				req.Header.Set("User-Agent", "Mozilla/5.0")
				resp, err := probeClient.Do(req)
				if err != nil { continue }
				body, _ := io.ReadAll(io.LimitReader(resp.Body, 100*1024))
				resp.Body.Close()
				info.Status = resp.StatusCode
				info.StatusText = http.StatusText(resp.StatusCode)

				// Check HTTP body for takeover fingerprints
				if !info.Takeover {
					bodyStr := string(body)
					for svc, fingerprint := range takeoverBodyFingerprints {
						if strings.Contains(bodyStr, fingerprint) {
							info.Takeover = true
							info.TakeoverSvc = svc + " (HTTP)"
							break
						}
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

func scrapeWebsite(domain string) ([]string, []Social, []string) {
	emailRe := regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)

	pages := []string{
		"", "/contact", "/about", "/team", "/about-us", "/contact-us",
		"/imprint", "/privacy", "/legal", "/jobs", "/careers",
		"/people", "/staff", "/our-team", "/leadership",
	}

	emailSet := map[string]bool{}
	socialSet := map[string]bool{}
	techSet := map[string]bool{}
	var socials []Social

	socialPatterns := map[string]*regexp.Regexp{
		"LinkedIn":  regexp.MustCompile(`https?://(?:www\.)?linkedin\.com/(?:company|in)/[a-zA-Z0-9_-]+/?`),
		"Twitter":   regexp.MustCompile(`https?://(?:www\.)?(?:twitter|x)\.com/[a-zA-Z0-9_]+/?`),
		"GitHub":    regexp.MustCompile(`https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+/?`),
		"Facebook":  regexp.MustCompile(`https?://(?:www\.)?facebook\.com/[a-zA-Z0-9._-]+/?`),
		"Instagram": regexp.MustCompile(`https?://(?:www\.)?instagram\.com/[a-zA-Z0-9._-]+/?`),
		"YouTube":   regexp.MustCompile(`https?://(?:www\.)?youtube\.com/(?:@|channel/|c/)[a-zA-Z0-9_-]+/?`),
	}

	techPatterns := map[string]string{
		"WordPress": "/wp-content/", "React": "react", "Next.js": "/_next/",
		"Vue.js": "data-v-", "Angular": "ng-version", "Laravel": "laravel",
		"Django": "csrfmiddlewaretoken", "Shopify": "cdn.shopify.com",
		"Cloudflare": "cf-ray", "Google Analytics": "google-analytics",
		"jQuery": "jquery", "Bootstrap": "bootstrap", "Tailwind": "tailwindcss",
	}

	for _, page := range pages {
		for _, scheme := range []string{"https://", "http://"} {
			body, err := httpGet(scheme + domain + page)
			if err != nil { continue }
			bodyLower := strings.ToLower(body)

			for _, m := range emailRe.FindAllString(body, -1) {
				if isValidEmail(strings.ToLower(m)) { emailSet[strings.ToLower(m)] = true }
			}
			for platform, re := range socialPatterns {
				for _, m := range re.FindAllString(body, 3) {
					if !socialSet[m] {
						socialSet[m] = true
						socials = append(socials, Social{Platform: platform, URL: m})
					}
				}
			}
			for tech, pattern := range techPatterns {
				if strings.Contains(bodyLower, strings.ToLower(pattern)) { techSet[tech] = true }
			}
			break
		}
	}

	var emails []string
	for e := range emailSet { emails = append(emails, e) }
	var tech []string
	for t := range techSet { tech = append(tech, t) }
	return emails, socials, tech
}

func isValidEmail(e string) bool {
	bad := []string{".png", ".jpg", ".gif", ".svg", ".css", ".js", ".woff",
		"example.com", "sentry", "webpack", "wixpress", "schema.org",
		"w3.org", "noreply", "no-reply", ".local"}
	for _, b := range bad {
		if strings.Contains(e, b) { return false }
	}
	return true
}

func fetchCrtSh(domain string) []string {
	// Use longer timeout for crt.sh
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

	seen := map[string]bool{}
	var subs []string
	for _, e := range entries {
		for _, n := range strings.Split(e.NameValue, "\n") {
			n = strings.TrimSpace(strings.ToLower(n))
			n = strings.TrimPrefix(n, "*.")
			if n != "" && n != domain && !seen[n] && strings.HasSuffix(n, "."+domain) {
				seen[n] = true
				subs = append(subs, n)
			}
		}
	}
	return subs
}

func fetchWayback(domain string) []string {
	url := fmt.Sprintf("https://web.archive.org/cdx/search/cdx?url=*.%s/*&output=json&fl=original&collapse=urlkey&limit=500", domain)
	body, err := httpGet(url)
	if err != nil { return nil }

	var rows [][]string
	json.Unmarshal([]byte(body), &rows)

	seen := map[string]bool{}
	var urls []string
	for i, row := range rows {
		if i == 0 || len(row) == 0 { continue }
		u := row[0]
		if !seen[u] { seen[u] = true; urls = append(urls, u) }
	}
	return urls
}

func fetchRobotsTxt(domain string) []string {
	body, err := httpGet("https://" + domain + "/robots.txt")
	if err != nil { return nil }

	var paths []string
	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		lower := strings.ToLower(line)
		if strings.HasPrefix(lower, "disallow:") || strings.HasPrefix(lower, "allow:") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				p := strings.TrimSpace(parts[1])
				if p != "" && p != "/" { paths = append(paths, p) }
			}
		}
	}
	return paths
}

func fetchSitemap(domain string) []string {
	locRe := regexp.MustCompile(`<loc>([^<]+)</loc>`)
	body, err := httpGet("https://" + domain + "/sitemap.xml")
	if err != nil { return nil }

	var pages []string
	for _, m := range locRe.FindAllStringSubmatch(body, 100) {
		if len(m) > 1 { pages = append(pages, m[1]) }
	}
	return pages
}

func lookupDNS(domain string) DNSRecords {
	dns := DNSRecords{}

	ips, _ := net.LookupIP(domain)
	for _, ip := range ips {
		if ip.To4() != nil { dns.A = append(dns.A, ip.String()) } else { dns.AAAA = append(dns.AAAA, ip.String()) }
	}

	mxs, _ := net.LookupMX(domain)
	for _, mx := range mxs { dns.MX = append(dns.MX, MXRecord{Host: strings.TrimSuffix(mx.Host, "."), Pref: mx.Pref}) }

	nss, _ := net.LookupNS(domain)
	for _, ns := range nss { dns.NS = append(dns.NS, strings.TrimSuffix(ns.Host, ".")) }

	txts, _ := net.LookupTXT(domain)
	dns.TXT = txts

	cname, _ := net.LookupCNAME(domain)
	dns.CNAME = strings.TrimSuffix(cname, ".")

	return dns
}
