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
	"sync"
	"time"
)

type Output struct {
	Success  bool      `json:"success"`
	Domain   string    `json:"domain"`
	Findings []Finding `json:"findings"`
	Scanned  int       `json:"scanned"`
	Error    string    `json:"error,omitempty"`
}

type Finding struct {
	Path       string `json:"path"`
	URL        string `json:"url"`
	StatusCode int    `json:"statusCode"`
	Size       int    `json:"size"`
	Category   string `json:"category"`
	Severity   string `json:"severity"`
	Preview    string `json:"preview"`
}

var httpClient = &http.Client{
	Timeout: 8 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		DialContext:         (&net.Dialer{Timeout: 4 * time.Second}).DialContext,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
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
	paths := getAllPaths()
	result.Scanned = len(paths)

	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, 25)

	baseURL := fmt.Sprintf("https://%s", d)

	// First get a baseline 404 response to filter false positives
	baseline404 := getBaseline404(baseURL)

	for _, p := range paths {
		wg.Add(1)
		pp := p
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			finding := checkPath(baseURL, pp, baseline404)
			if finding != nil {
				mu.Lock()
				result.Findings = append(result.Findings, *finding)
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func fail(msg string) {
	out, _ := json.Marshal(Output{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

func getBaseline404(baseURL string) string {
	req, _ := http.NewRequest("GET", baseURL+"/thispathshouldnotexist_"+fmt.Sprintf("%d", time.Now().UnixNano()), nil)
	if req == nil { return "" }
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := httpClient.Do(req)
	if err != nil { return "" }
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))
	resp.Body.Close()
	return string(body)
}

func checkPath(baseURL string, p pathEntry, baseline404 string) *Finding {
	url := baseURL + p.Path
	req, err := http.NewRequest("GET", url, nil)
	if err != nil { return nil }
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := httpClient.Do(req)
	if err != nil { return nil }
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 32768))
	resp.Body.Close()

	if resp.StatusCode == 404 || resp.StatusCode == 403 || resp.StatusCode == 401 ||
		resp.StatusCode == 405 || resp.StatusCode == 503 || resp.StatusCode >= 500 {
		return nil
	}

	// Skip redirects to login pages
	if resp.StatusCode == 301 || resp.StatusCode == 302 || resp.StatusCode == 307 {
		loc := resp.Header.Get("Location")
		if strings.Contains(loc, "login") || strings.Contains(loc, "signin") || strings.Contains(loc, "auth") {
			return nil
		}
		return nil
	}

	if resp.StatusCode != 200 { return nil }
	if len(body) < 2 { return nil }

	bodyStr := string(body)

	// Filter out soft 404s
	if baseline404 != "" && len(baseline404) > 100 && len(bodyStr) > 100 {
		if similarity(bodyStr, baseline404) > 0.9 { return nil }
	}

	// Filter HTML error pages
	lower := strings.ToLower(bodyStr)
	errorIndicators := []string{"page not found", "404 not found", "does not exist",
		"page you requested", "couldn't find", "no longer available", "error 404"}
	for _, ind := range errorIndicators {
		if strings.Contains(lower, ind) { return nil }
	}

	// Validate content matches expected type
	if !validateContent(p, bodyStr) { return nil }

	preview := bodyStr
	if len(preview) > 300 { preview = preview[:300] }
	// Remove sensitive data from preview
	preview = strings.ReplaceAll(preview, "\n", " ")
	preview = strings.ReplaceAll(preview, "\r", "")

	return &Finding{
		Path:       p.Path,
		URL:        url,
		StatusCode: resp.StatusCode,
		Size:       len(body),
		Category:   p.Category,
		Severity:   p.Severity,
		Preview:    preview,
	}
}

func validateContent(p pathEntry, body string) bool {
	lower := strings.ToLower(body)
	switch p.Category {
	case "Source Code":
		if strings.Contains(p.Path, ".git") {
			return strings.Contains(body, "ref:") || strings.Contains(body, "[core]") ||
				strings.Contains(body, "[remote") || strings.Contains(body, "repositoryformatversion")
		}
		if strings.Contains(p.Path, ".svn") { return strings.Contains(body, "svn") || strings.Contains(body, "dir") }
		return true
	case "Secrets":
		return !strings.Contains(lower, "<html") || strings.Contains(lower, "password") ||
			strings.Contains(lower, "secret") || strings.Contains(lower, "api_key")
	case "Database":
		return strings.Contains(lower, "sql") || strings.Contains(lower, "insert") ||
			strings.Contains(lower, "create table") || !strings.Contains(lower, "<html")
	case "Debug":
		return !strings.Contains(lower, "page not found")
	case "API Docs":
		return strings.Contains(lower, "swagger") || strings.Contains(lower, "openapi") ||
			strings.Contains(lower, "paths") || strings.Contains(lower, "api") || strings.Contains(lower, "{")
	case "Package":
		return strings.Contains(body, "{") || strings.Contains(lower, "name") || strings.Contains(lower, "version")
	default:
		return !strings.Contains(lower, "<title>404") && !strings.Contains(lower, "not found")
	}
}

func similarity(a, b string) float64 {
	if len(a) == 0 || len(b) == 0 { return 0 }
	lenDiff := float64(len(a)-len(b)) / float64(max(len(a), len(b)))
	if lenDiff < 0 { lenDiff = -lenDiff }
	if lenDiff > 0.1 { return 0 }
	matches := 0
	shorter := a
	if len(b) < len(a) { shorter = b }
	checkLen := min(len(shorter), 500)
	for i := 0; i < checkLen; i++ {
		if a[i] == b[i] { matches++ }
	}
	return float64(matches) / float64(checkLen)
}

func max(a, b int) int { if a > b { return a }; return b }
func min(a, b int) int { if a < b { return a }; return b }

type pathEntry struct {
	Path     string
	Category string
	Severity string
}

