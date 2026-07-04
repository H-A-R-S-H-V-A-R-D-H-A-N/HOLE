package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"net"
)

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

	subdomainSet := map[string]bool{}

	// Subdomain Sources
	sources := []func(string) []string{
		fetchCrtSh, fetchHackerTarget, fetchAlienVault,
		fetchURLScan, fetchThreatCrowd, fetchRapidDNS,
		fetchAnubis,
	}

	for _, src := range sources {
		wg.Add(1)
		go func(f func(string) []string) {
			defer wg.Done()
			subs := f(d)
			mu.Lock()
			for _, s := range subs {
				if strings.HasSuffix(strings.ToLower(s), d) {
					subdomainSet[strings.ToLower(s)] = true
				}
			}
			mu.Unlock()
		}(src)
	}

	// Intel Modules
	wg.Add(1)
	go func() {
		defer wg.Done()
		geo := getGeoInfo(d) // Note: needs an IP ideally, but works loosely
		if geo == nil {
			ips, _ := net.LookupIP(d)
			if len(ips) > 0 { geo = getGeoInfo(ips[0].String()) }
		}
		mu.Lock()
		result.GeoInfo = geo
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		revIP := getReverseIP(d)
		mu.Lock()
		result.ReverseIP = revIP
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		headers := checkSecurityHeaders(d)
		mu.Lock()
		result.Headers = headers
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		ssl := getSSLInfo(d)
		mu.Lock()
		result.SSL = ssl
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		whois := getWhois(d)
		mu.Lock()
		result.Whois = whois
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		ports := runNmap(d)
		mu.Lock()
		result.Ports = ports
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		// Scrape for emails and tech stack
		emails, socials, tech := scrapeWebsite(d)
		mu.Lock()
		result.Emails = emails
		result.Socials = socials
		result.TechStack = tech
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		dns := getDNSRecords(d)
		mu.Lock()
		result.DNS = dns
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		waf := detectWAF(d)
		mu.Lock()
		result.WAF = waf
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		buckets := findBuckets(d)
		mu.Lock()
		result.Buckets = buckets
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		favicon := getFaviconHash(d)
		mu.Lock()
		result.FaviconHash = favicon
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		jsFiles := extractJSFiles(d)
		mu.Lock()
		result.JSFiles = jsFiles
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		exposures := huntExposures(d)
		mu.Lock()
		result.Exposures = exposures
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		wayback := fetchWaybackURLs(d)
		mu.Lock()
		result.WaybackURLs = wayback
		mu.Unlock()
	}()

	wg.Wait()

	// Consolidate subdomains
	var subList []string
	for s := range subdomainSet { subList = append(subList, s) }

	// Probe all subdomains for status, CNAME, and takeover
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

func scrapeWebsite(domain string) ([]string, []Social, []string) {
	emailRe := regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	body, err := httpGet("https://" + domain)
	if err != nil { return nil, nil, nil }

	emailSet := map[string]bool{}
	for _, m := range emailRe.FindAllString(body, -1) {
		emailSet[strings.ToLower(m)] = true
	}
	var emails []string
	for e := range emailSet { emails = append(emails, e) }

	return emails, nil, nil
}
