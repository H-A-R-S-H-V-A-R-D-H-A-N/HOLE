package main

import (
	"crypto/tls"
	"encoding/json"
	"encoding/xml"
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
	Success bool     `json:"success"`
	Company string   `json:"company"`
	Buckets []Bucket `json:"buckets"`
	Error   string   `json:"error,omitempty"`
}

type Bucket struct {
	Provider    string   `json:"provider"`    // AWS, Azure, GCP
	Name        string   `json:"name"`        // bucket name
	URL         string   `json:"url"`         // full URL
	Status      string   `json:"status"`      // open, exists, not_found
	StatusCode  int      `json:"statusCode"`
	Listable    bool     `json:"listable"`    // can list contents
	FileCount   int      `json:"fileCount"`   // number of files if listable
	SampleFiles []string `json:"sampleFiles"` // first 5 file names
	Severity    string   `json:"severity"`    // critical, high, info
}

// S3 ListBucketResult for parsing XML
type S3ListResult struct {
	XMLName  xml.Name  `xml:"ListBucketResult"`
	Contents []S3Key   `xml:"Contents"`
}
type S3Key struct {
	Key  string `xml:"Key"`
	Size int64  `xml:"Size"`
}

// Azure container listing
type AzureListResult struct {
	XMLName xml.Name    `xml:"EnumerationResults"`
	Blobs   AzureBlobs  `xml:"Blobs"`
}
type AzureBlobs struct {
	Blob []AzureBlob `xml:"Blob"`
}
type AzureBlob struct {
	Name string `xml:"Name"`
}

var httpClient = &http.Client{
	Timeout: 8 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 5,
		DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

func main() {
	company := flag.String("company", "", "Company/target name")
	domain := flag.String("domain", "", "Optional domain for smarter name generation")
	flag.Parse()

	if *company == "" {
		fail("Company name is required")
	}

	result := Output{Success: true, Company: *company}
	names := generateBucketNames(*company, *domain)

	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, 15) // concurrency limit

	for _, name := range names {
		// Check all 3 providers for each name
		providers := []struct {
			name    string
			checker func(string) *Bucket
		}{
			{"AWS S3", checkS3},
			{"Azure Blob", checkAzure},
			{"GCP Storage", checkGCP},
		}

		for _, p := range providers {
			wg.Add(1)
			prov := p
			bucketName := name
			go func() {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				bucket := prov.checker(bucketName)
				if bucket != nil && bucket.Status != "not_found" {
					mu.Lock()
					result.Buckets = append(result.Buckets, *bucket)
					mu.Unlock()
				}
			}()
		}
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

func generateBucketNames(company, domain string) []string {
	c := strings.ToLower(strings.TrimSpace(company))
	c = strings.ReplaceAll(c, " ", "")

	// Also create hyphenated version
	cHyphen := strings.ToLower(strings.TrimSpace(company))
	cHyphen = strings.ReplaceAll(cHyphen, " ", "-")

	// Domain without TLD
	domainBase := ""
	if domain != "" {
		parts := strings.Split(strings.ToLower(domain), ".")
		if len(parts) > 0 {
			domainBase = parts[0]
		}
	}

	bases := removeDuplicates([]string{c, cHyphen, domainBase})

	suffixes := []string{
		"", "-dev", "-development", "-staging", "-stage", "-stg", "-prod", "-production", "-prd",
		"-backup", "-backups", "-bak", "-bkp", "-old", "-archive", "-archived",
		"-assets", "-static", "-media", "-images", "-img", "-photos", "-video", "-videos",
		"-uploads", "-upload", "-files", "-file", "-data", "-docs", "-documents", "-pdf", "-pdfs",
		"-public", "-private", "-internal", "-external", "-restricted", "-shared",
		"-test", "-testing", "-qa", "-uat", "-sandbox", "-demo", "-temp", "-tmp",
		"-api", "-app", "-web", "-www", "-cdn", "-edge", "-frontend", "-backend",
		"-logs", "-log", "-logging", "-audit", "-monitoring", "-metrics",
		"-db", "-database", "-mysql", "-postgres", "-mongo", "-redis", "-elastic",
		"-config", "-configs", "-env", "-settings",
		"-terraform", "-tf", "-tfstate", "-infra", "-cloudformation", "-ansible", "-k8s",
		"-deploy", "-deployment", "-ci", "-cd", "-cicd", "-pipeline", "-jenkins", "-github", "-gitlab",
		"-releases", "-release", "-dist", "-build", "-builds", "-artifacts", "-packages", "-docker",
		"-mobile", "-android", "-ios",
		"-email", "-mail", "-smtp", "-newsletter",
		"-s3", "-bucket", "-storage", "-blob", "-store",
		"-reports", "-report", "-analytics", "-dashboard",
		"-secret", "-secrets", "-keys", "-key", "-credentials", "-creds", "-tokens", "-certs", "-ssl",
		"-hr", "-finance", "-legal", "-sales", "-marketing", "-engineering", "-support", "-ops", "-devops",
		"-users", "-user", "-customer", "-customers", "-client", "-clients", "-accounts",
		"-content", "-cms", "-blog", "-website",
		"-lambda", "-functions", "-serverless",
		"-training", "-ml", "-ai", "-model", "-models",
		"-source", "-src", "-code", "-repo", "-git",
		"-snapshots", "-snapshot", "-dump", "-dumps", "-export", "-exports", "-import",
		"-invoices", "-billing", "-payments", "-orders",
		"-avatar", "-avatars", "-profile", "-thumbnails",
		"-cache", "-cdn-assets", "-wp", "-wordpress",
		"-scripts", "-tools", "-vendor", "-vendors", "-partner",
		"-research", "-lab", "-labs", "-poc", "-prototype",
	}

	prefixes := []string{
		"", "dev-", "staging-", "stg-", "prod-", "production-", "test-", "qa-",
		"backup-", "bak-", "s3-", "data-", "api-", "cdn-", "web-",
		"internal-", "public-", "private-", "shared-",
		"old-", "archive-", "temp-", "tmp-",
	}

	years := []string{"-2020", "-2021", "-2022", "-2023", "-2024", "-2025", "-2026"}

	seen := map[string]bool{}
	var names []string

	for _, base := range bases {
		if base == "" { continue }
		for _, suffix := range suffixes {
			name := base + suffix
			if !seen[name] && len(name) >= 3 && len(name) <= 63 { seen[name] = true; names = append(names, name) }
		}
		for _, prefix := range prefixes {
			if prefix == "" { continue }
			name := prefix + base
			if !seen[name] && len(name) >= 3 && len(name) <= 63 { seen[name] = true; names = append(names, name) }
		}
		for _, year := range years {
			name := base + year
			if !seen[name] { seen[name] = true; names = append(names, name) }
			for _, s := range []string{"-backup", "-data", "-dump", "-export", "-archive"} {
				n2 := base + s + year
				if !seen[n2] && len(n2) <= 63 { seen[n2] = true; names = append(names, n2) }
			}
		}
		for i := 1; i <= 3; i++ {
			for _, pat := range []string{"%s%d", "%s-%d", "%s-v%d"} {
				name := fmt.Sprintf(pat, base, i)
				if !seen[name] { seen[name] = true; names = append(names, name) }
			}
		}
	}

	return names
}

func removeDuplicates(s []string) []string {
	seen := map[string]bool{}
	var result []string
	for _, v := range s {
		if v != "" && !seen[v] {
			seen[v] = true
			result = append(result, v)
		}
	}
	return result
}

func checkS3(name string) *Bucket {
	// AWS S3: check both path-style and virtual-hosted
	urls := []string{
		fmt.Sprintf("https://%s.s3.amazonaws.com/", name),
		fmt.Sprintf("https://s3.amazonaws.com/%s/", name),
	}

	for _, url := range urls {
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0")
		resp, err := httpClient.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
		resp.Body.Close()

		bucket := &Bucket{
			Provider:   "AWS S3",
			Name:       name,
			URL:        url,
			StatusCode: resp.StatusCode,
		}

		switch resp.StatusCode {
		case 200:
			// Check if it's actually listing contents (XML with ListBucketResult)
			var listResult S3ListResult
			if xml.Unmarshal(body, &listResult) == nil && len(listResult.Contents) > 0 {
				bucket.Status = "open"
				bucket.Listable = true
				bucket.FileCount = len(listResult.Contents)
				bucket.Severity = "critical"
				for i, k := range listResult.Contents {
					if i >= 5 {
						break
					}
					bucket.SampleFiles = append(bucket.SampleFiles, k.Key)
				}
			} else {
				// 200 but no listing — could be a website or access point
				bodyStr := string(body)
				if strings.Contains(bodyStr, "ListBucketResult") {
					bucket.Status = "open"
					bucket.Listable = true
					bucket.Severity = "critical"
				} else {
					bucket.Status = "exists"
					bucket.Severity = "info"
				}
			}
			return bucket

		case 403:
			// Bucket exists but access denied — confirmed real bucket
			bucket.Status = "exists"
			bucket.Severity = "high"
			return bucket

		case 404:
			// NoSuchBucket — doesn't exist, skip
			continue

		default:
			continue
		}
	}

	return &Bucket{Status: "not_found"}
}

func checkAzure(name string) *Bucket {
	// Azure Blob Storage: <account>.blob.core.windows.net/<container>
	// We check if the storage account exists and if containers are listable
	url := fmt.Sprintf("https://%s.blob.core.windows.net/?comp=list&restype=container", name)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := httpClient.Do(req)
	if err != nil {
		// DNS doesn't resolve = account doesn't exist
		return &Bucket{Status: "not_found"}
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	resp.Body.Close()

	bucket := &Bucket{
		Provider:   "Azure Blob",
		Name:       name,
		URL:        fmt.Sprintf("https://%s.blob.core.windows.net/", name),
		StatusCode: resp.StatusCode,
	}

	switch resp.StatusCode {
	case 200:
		// Container listing is public
		bucket.Status = "open"
		bucket.Listable = true
		bucket.Severity = "critical"

		// Try to parse the container listing
		bodyStr := string(body)
		if strings.Contains(bodyStr, "<Container>") || strings.Contains(bodyStr, "EnumerationResults") {
			bucket.SampleFiles = extractBetween(bodyStr, "<Name>", "</Name>", 5)
			bucket.FileCount = strings.Count(bodyStr, "<Container>")
		}
		return bucket

	case 403:
		bucket.Status = "exists"
		bucket.Severity = "high"
		return bucket

	case 404:
		return &Bucket{Status: "not_found"}

	default:
		// Check if the account itself exists (DNS resolves)
		_, dnsErr := net.LookupHost(fmt.Sprintf("%s.blob.core.windows.net", name))
		if dnsErr == nil {
			bucket.Status = "exists"
			bucket.Severity = "info"
			return bucket
		}
		return &Bucket{Status: "not_found"}
	}
}

func checkGCP(name string) *Bucket {
	url := fmt.Sprintf("https://storage.googleapis.com/%s/", name)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := httpClient.Do(req)
	if err != nil {
		return &Bucket{Status: "not_found"}
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	resp.Body.Close()

	bucket := &Bucket{
		Provider:   "GCP Storage",
		Name:       name,
		URL:        url,
		StatusCode: resp.StatusCode,
	}

	switch resp.StatusCode {
	case 200:
		var listResult S3ListResult // GCP uses same XML format
		if xml.Unmarshal(body, &listResult) == nil && len(listResult.Contents) > 0 {
			bucket.Status = "open"
			bucket.Listable = true
			bucket.FileCount = len(listResult.Contents)
			bucket.Severity = "critical"
			for i, k := range listResult.Contents {
				if i >= 5 {
					break
				}
				bucket.SampleFiles = append(bucket.SampleFiles, k.Key)
			}
		} else {
			bodyStr := string(body)
			if strings.Contains(bodyStr, "ListBucketResult") {
				bucket.Status = "open"
				bucket.Listable = true
				bucket.Severity = "critical"
			} else {
				bucket.Status = "exists"
				bucket.Severity = "info"
			}
		}
		return bucket

	case 403:
		bucket.Status = "exists"
		bucket.Severity = "high"
		return bucket

	case 404:
		return &Bucket{Status: "not_found"}

	default:
		return &Bucket{Status: "not_found"}
	}
}

func extractBetween(s, start, end string, max int) []string {
	var results []string
	remaining := s
	for i := 0; i < max; i++ {
		idx := strings.Index(remaining, start)
		if idx == -1 {
			break
		}
		remaining = remaining[idx+len(start):]
		endIdx := strings.Index(remaining, end)
		if endIdx == -1 {
			break
		}
		results = append(results, remaining[:endIdx])
		remaining = remaining[endIdx+len(end):]
	}
	return results
}
