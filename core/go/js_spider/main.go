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
	"sort"
	"strings"
	"sync"
	"time"
)

type Output struct {
	Success    bool       `json:"success"`
	Domain     string     `json:"domain"`
	JSFiles    []string   `json:"jsFiles"`
	Endpoints  []Endpoint `json:"endpoints"`
	TotalJS    int        `json:"totalJs"`
	TotalBytes int        `json:"totalBytes"`
	Error      string     `json:"error,omitempty"`
}

type Endpoint struct {
	Path     string `json:"path"`
	FullURL  string `json:"fullUrl,omitempty"`
	Method   string `json:"method,omitempty"`
	Source   string `json:"source"`
	Category string `json:"category"`
	HasAuth  bool   `json:"hasAuth"`
	Context  string `json:"context"`
}

var client = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
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
	result := Output{Success: true, Domain: d}

	// Step 1: Fetch main page and find all JS files
	html := fetch(baseURL)
	if html == "" { fail("Cannot reach " + d) }

	jsURLs := extractJSURLs(html, baseURL, d)

	// Also check common JS paths
	commonJS := []string{
		"/main.js", "/app.js", "/bundle.js", "/vendor.js", "/chunk.js",
		"/static/js/main.js", "/static/js/app.js",
		"/assets/js/app.js", "/assets/js/main.js",
		"/dist/js/app.js", "/build/static/js/main.js",
		"/js/app.js", "/js/main.js", "/js/script.js",
	}
	for _, p := range commonJS {
		jsURLs[baseURL+p] = true
	}

	// Step 2: Download all JS files concurrently
	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, 10)
	allEndpoints := map[string]*Endpoint{}
	totalBytes := 0

	var foundJS []string

	for url := range jsURLs {
		wg.Add(1)
		u := url
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			body := fetch(u)
			if body == "" || len(body) < 50 { return }
			// Verify it's actually JS (not HTML error page)
			prefix := strings.ToLower(body[:min(200, len(body))])
			if strings.Contains(prefix, "<html") || strings.Contains(prefix, "<!doctype") { return }

			mu.Lock()
			foundJS = append(foundJS, u)
			totalBytes += len(body)
			mu.Unlock()

			// Extract endpoints from this JS file
			endpoints := extractEndpoints(body, u, d)
			mu.Lock()
			for _, ep := range endpoints {
				key := ep.Method + ":" + ep.Path
				if _, exists := allEndpoints[key]; !exists {
					e := ep
					allEndpoints[key] = &e
				}
			}
			mu.Unlock()
		}()
	}

	wg.Wait()

	// Also extract from HTML
	htmlEndpoints := extractEndpoints(html, baseURL, d)
	for _, ep := range htmlEndpoints {
		key := ep.Method + ":" + ep.Path
		if _, exists := allEndpoints[key]; !exists {
			e := ep
			allEndpoints[key] = &e
		}
	}

	// Build result
	result.JSFiles = foundJS
	result.TotalJS = len(foundJS)
	result.TotalBytes = totalBytes

	for _, ep := range allEndpoints {
		result.Endpoints = append(result.Endpoints, *ep)
	}
	sort.Slice(result.Endpoints, func(i, j int) bool {
		ci := catPriority(result.Endpoints[i].Category)
		cj := catPriority(result.Endpoints[j].Category)
		if ci != cj { return ci < cj }
		return result.Endpoints[i].Path < result.Endpoints[j].Path
	})

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func fail(msg string) {
	out, _ := json.Marshal(Output{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

func fetch(url string) string {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil { return "" }
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,application/javascript,text/javascript,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Referer", url)
	resp, err := client.Do(req)
	if err != nil { return "" }
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	resp.Body.Close()
	if resp.StatusCode != 200 { return "" }
	return string(body)
}

func extractJSURLs(html, baseURL, domain string) map[string]bool {
	urls := map[string]bool{}

	// <script src="...">
	re := regexp.MustCompile(`<script[^>]+src=["']([^"']+)["']`)
	for _, m := range re.FindAllStringSubmatch(html, -1) {
		u := resolveURL(m[1], baseURL, domain)
		if u != "" {
			// Accept .js files and also paths without extension (could be JS)
			base := strings.Split(u, "?")[0]
			if strings.HasSuffix(base, ".js") || strings.HasSuffix(base, ".mjs") {
				urls[u] = true
			}
		}
	}

	// Find chunk/lazy loaded JS in HTML and inline scripts
	reChunk := regexp.MustCompile(`["']([^"'\s]*\.(?:js|mjs)(?:\?[^"']*)?)["']`)
	for _, m := range reChunk.FindAllStringSubmatch(html, -1) {
		if strings.Contains(m[1], "/") && !strings.HasPrefix(m[1], "data:") {
			u := resolveURL(m[1], baseURL, domain)
			if u != "" { urls[u] = true }
		}
	}

	// Extract inline script content and look for JS file references
	reInline := regexp.MustCompile(`<script[^>]*>([\s\S]*?)</script>`)
	for _, m := range reInline.FindAllStringSubmatch(html, -1) {
		if len(m[1]) > 20 {
			// Search inline scripts for more JS URLs
			for _, m2 := range reChunk.FindAllStringSubmatch(m[1], -1) {
				if strings.Contains(m2[1], "/") {
					u := resolveURL(m2[1], baseURL, domain)
					if u != "" { urls[u] = true }
				}
			}
		}
	}

	return urls
}

func extractEndpoints(content, source, domain string) []Endpoint {
	var endpoints []Endpoint
	seen := map[string]bool{}

	// Pattern 1: API paths like "/api/v1/users", "/v2/admin/config"
	reAPI := regexp.MustCompile(`["'\x60](/(?:api|v[0-9]+|rest|graphql|admin|internal|private|debug|auth|oauth|user|users|account|accounts|login|register|signup|signin|logout|session|token|password|reset|verify|confirm|profile|settings|config|upload|download|export|import|search|webhook|callback|notification|payment|order|cart|checkout|invoice|subscription|dashboard|manage|report|analytics|metric|health|status|info|version|test|dev|staging|prod|backend|frontend|mobile|app|service|worker|cron|job|task|queue|cache|log|audit|monitor|proxy|gateway|cdn|asset|static|media|image|file|doc|document|pdf|csv|xml|json|rss|feed|sitemap|robots|well-known)/[a-zA-Z0-9/_\-\.{}:]+)["'\x60]`)
	for _, m := range reAPI.FindAllStringSubmatch(content, -1) {
		path := cleanPath(m[1])
		if !seen[path] && isValidEndpoint(path) {
			seen[path] = true
			endpoints = append(endpoints, makeEndpoint(path, source, domain, getContext(content, m[0])))
		}
	}

	// Pattern 2: fetch/axios/http calls
	reFetch := regexp.MustCompile(`(?:fetch|axios|\.get|\.post|\.put|\.delete|\.patch|\.request|http\.)\s*\(\s*["'\x60]([^"'\x60\s]+)["'\x60]`)
	for _, m := range reFetch.FindAllStringSubmatch(content, -1) {
		path := m[1]
		if strings.HasPrefix(path, "/") || strings.HasPrefix(path, "http") {
			path = cleanPath(path)
			if !seen[path] && isValidEndpoint(path) {
				seen[path] = true
				ep := makeEndpoint(path, source, domain, getContext(content, m[0]))
				// Detect method from call
				call := strings.ToLower(m[0])
				if strings.Contains(call, ".post") { ep.Method = "POST" }
				if strings.Contains(call, ".put") { ep.Method = "PUT" }
				if strings.Contains(call, ".delete") { ep.Method = "DELETE" }
				if strings.Contains(call, ".patch") { ep.Method = "PATCH" }
				endpoints = append(endpoints, ep)
			}
		}
	}

	// Pattern 3: XMLHttpRequest.open
	reXHR := regexp.MustCompile(`\.open\s*\(\s*["'](GET|POST|PUT|DELETE|PATCH)["']\s*,\s*["']([^"']+)["']`)
	for _, m := range reXHR.FindAllStringSubmatch(content, -1) {
		path := cleanPath(m[2])
		if !seen[path] && isValidEndpoint(path) {
			seen[path] = true
			ep := makeEndpoint(path, source, domain, getContext(content, m[0]))
			ep.Method = m[1]
			endpoints = append(endpoints, ep)
		}
	}

	// Pattern 4: Route definitions (React Router, Vue Router, Express)
	reRoute := regexp.MustCompile(`(?:path|route|url|endpoint|uri)\s*[:=]\s*["'\x60](/[a-zA-Z0-9/_\-\.{}:*]+)["'\x60]`)
	for _, m := range reRoute.FindAllStringSubmatch(content, -1) {
		path := cleanPath(m[1])
		if !seen[path] && isValidEndpoint(path) {
			seen[path] = true
			ep := makeEndpoint(path, source, domain, getContext(content, m[0]))
			ep.Category = "Route"
			endpoints = append(endpoints, ep)
		}
	}

	// Pattern 5: Full URLs to same domain or subdomains
	reFullURL := regexp.MustCompile(`["'\x60](https?://[a-zA-Z0-9\-\.]*` + regexp.QuoteMeta(domain) + `/[a-zA-Z0-9/_\-\.?&={}:%]+)["'\x60]`)
	for _, m := range reFullURL.FindAllStringSubmatch(content, -1) {
		path := m[1]
		if !seen[path] && len(path) < 500 {
			seen[path] = true
			ep := makeEndpoint(path, source, domain, getContext(content, m[0]))
			ep.FullURL = path
			endpoints = append(endpoints, ep)
		}
	}

	// Pattern 6: GraphQL queries
	reGQL := regexp.MustCompile(`(?:query|mutation|subscription)\s+(\w+)\s*[\({]`)
	for _, m := range reGQL.FindAllStringSubmatch(content, -1) {
		name := m[1]
		path := "GraphQL:" + name
		if !seen[path] {
			seen[path] = true
			endpoints = append(endpoints, Endpoint{
				Path: path, Source: source, Category: "GraphQL",
				Method: "POST", Context: getContext(content, m[0]),
			})
		}
	}

	// Pattern 7: WebSocket URLs
	reWS := regexp.MustCompile(`["'\x60](wss?://[^"'\x60\s]+)["'\x60]`)
	for _, m := range reWS.FindAllStringSubmatch(content, -1) {
		path := m[1]
		if !seen[path] {
			seen[path] = true
			endpoints = append(endpoints, Endpoint{
				Path: path, Source: source, Category: "WebSocket",
				Method: "WS", Context: getContext(content, m[0]),
			})
		}
	}

	// Pattern 8: Interesting standalone paths
	reStandalone := regexp.MustCompile(`["'\x60](/[a-zA-Z0-9]+(?:/[a-zA-Z0-9_\-\.{}:]+){1,6})["'\x60]`)
	for _, m := range reStandalone.FindAllStringSubmatch(content, -1) {
		path := cleanPath(m[1])
		if !seen[path] && isInterestingPath(path) && isValidEndpoint(path) {
			seen[path] = true
			endpoints = append(endpoints, makeEndpoint(path, source, domain, getContext(content, m[0])))
		}
	}

	return endpoints
}

func makeEndpoint(path, source, domain, context string) Endpoint {
	ep := Endpoint{
		Path:    path,
		Source:  source,
		Method:  "GET",
		Context: context,
	}

	// Categorize
	lower := strings.ToLower(path)
	switch {
	case strings.Contains(lower, "/admin") || strings.Contains(lower, "/manage") || strings.Contains(lower, "/dashboard"):
		ep.Category = "Admin"
		ep.HasAuth = true
	case strings.Contains(lower, "/auth") || strings.Contains(lower, "/login") || strings.Contains(lower, "/session") ||
		strings.Contains(lower, "/token") || strings.Contains(lower, "/oauth") || strings.Contains(lower, "/signin") ||
		strings.Contains(lower, "/signup") || strings.Contains(lower, "/register") || strings.Contains(lower, "/password"):
		ep.Category = "Auth"
		ep.HasAuth = true
	case strings.Contains(lower, "/user") || strings.Contains(lower, "/account") || strings.Contains(lower, "/profile"):
		ep.Category = "User Data"
		ep.HasAuth = true
	case strings.Contains(lower, "/internal") || strings.Contains(lower, "/private") || strings.Contains(lower, "/debug") ||
		strings.Contains(lower, "/test") || strings.Contains(lower, "/dev") || strings.Contains(lower, "/staging"):
		ep.Category = "Internal"
	case strings.Contains(lower, "/upload") || strings.Contains(lower, "/file") || strings.Contains(lower, "/download") ||
		strings.Contains(lower, "/export") || strings.Contains(lower, "/import"):
		ep.Category = "File Ops"
	case strings.Contains(lower, "/payment") || strings.Contains(lower, "/order") || strings.Contains(lower, "/checkout") ||
		strings.Contains(lower, "/invoice") || strings.Contains(lower, "/subscription") || strings.Contains(lower, "/cart") ||
		strings.Contains(lower, "/billing"):
		ep.Category = "Payment"
		ep.HasAuth = true
	case strings.Contains(lower, "/webhook") || strings.Contains(lower, "/callback") || strings.Contains(lower, "/notify"):
		ep.Category = "Webhook"
	case strings.Contains(lower, "/search") || strings.Contains(lower, "/query") || strings.Contains(lower, "/filter"):
		ep.Category = "Search"
	case strings.Contains(lower, "/api") || strings.Contains(lower, "/v1") || strings.Contains(lower, "/v2") || strings.Contains(lower, "/v3"):
		ep.Category = "API"
	case strings.Contains(lower, "/graphql"):
		ep.Category = "GraphQL"
	case strings.Contains(lower, "/config") || strings.Contains(lower, "/setting") || strings.Contains(lower, "/preference"):
		ep.Category = "Config"
		ep.HasAuth = true
	default:
		ep.Category = "Other"
	}

	// Detect if path has ID params (IDOR potential)
	if strings.Contains(path, "{") || strings.Contains(path, ":id") ||
		regexp.MustCompile(`/\d+(/|$)`).MatchString(path) {
		ep.HasAuth = true
	}

	return ep
}

func getContext(content, match string) string {
	idx := strings.Index(content, match)
	if idx == -1 { return "" }
	start := idx - 40
	if start < 0 { start = 0 }
	end := idx + len(match) + 40
	if end > len(content) { end = len(content) }
	ctx := content[start:end]
	ctx = strings.ReplaceAll(ctx, "\n", " ")
	ctx = strings.ReplaceAll(ctx, "\r", "")
	ctx = strings.ReplaceAll(ctx, "\t", " ")
	return ctx
}

func cleanPath(path string) string {
	path = strings.Split(path, "?")[0]
	path = strings.Split(path, "#")[0]
	path = strings.TrimRight(path, "/")
	if path == "" { path = "/" }
	return path
}

func isValidEndpoint(path string) bool {
	if len(path) < 2 || len(path) > 300 { return false }
	// Skip static assets
	exts := []string{".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
		".woff", ".woff2", ".ttf", ".eot", ".map", ".webp", ".mp4", ".mp3",
		".pdf", ".zip", ".tar", ".gz", ".br", ".avif"}
	lower := strings.ToLower(path)
	for _, ext := range exts {
		if strings.HasSuffix(lower, ext) { return false }
	}
	// Skip framework internals
	if strings.HasPrefix(path, "/node_modules") { return false }
	if strings.HasPrefix(path, "/webpack") { return false }
	if strings.HasPrefix(path, "/__webpack") { return false }
	if strings.Contains(path, "sourceMappingURL") { return false }
	if strings.Count(path, "/") > 8 { return false }
	return true
}

func isInterestingPath(path string) bool {
	interesting := []string{
		"/admin", "/api", "/auth", "/user", "/account", "/internal",
		"/private", "/debug", "/config", "/setting", "/upload", "/download",
		"/export", "/import", "/payment", "/order", "/webhook", "/callback",
		"/token", "/session", "/login", "/register", "/password", "/reset",
		"/verify", "/confirm", "/profile", "/manage", "/dashboard", "/report",
		"/analytics", "/search", "/delete", "/update", "/create", "/edit",
		"/remove", "/add", "/submit", "/process", "/execute", "/run",
		"/invoke", "/trigger", "/send", "/notify", "/billing", "/invoice",
		"/checkout", "/cart", "/subscription", "/v1", "/v2", "/v3",
		"/graphql", "/rest", "/mobile", "/app",
	}
	lower := strings.ToLower(path)
	for _, p := range interesting {
		if strings.Contains(lower, p) { return true }
	}
	return false
}

func resolveURL(href, baseURL, domain string) string {
	if strings.HasPrefix(href, "//") { return "https:" + href }
	if strings.HasPrefix(href, "/") { return baseURL + href }
	if strings.HasPrefix(href, "http") { return href }
	return baseURL + "/" + href
}

func catPriority(cat string) int {
	switch cat {
	case "Internal": return 0
	case "Admin": return 1
	case "Auth": return 2
	case "User Data": return 3
	case "Payment": return 4
	case "File Ops": return 5
	case "Config": return 6
	case "Webhook": return 7
	case "API": return 8
	case "GraphQL": return 9
	case "WebSocket": return 10
	case "Search": return 11
	case "Route": return 12
	default: return 99
	}
}

func min(a, b int) int { if a < b { return a }; return b }
