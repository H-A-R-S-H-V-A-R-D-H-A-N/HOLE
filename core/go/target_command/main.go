package main

import (
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

type ParsedProgram struct {
	Success      bool         `json:"success"`
	ProgramName  string       `json:"programName"`
	URL          string       `json:"url"`
	Platform     string       `json:"platform"`
	InScope      []ScopeItem  `json:"inScope"`
	OutOfScope   []ScopeItem  `json:"outOfScope"`
	BountyTable  []BountyRow  `json:"bountyTable"`
	Policy       string       `json:"policy"`
	Error        string       `json:"error,omitempty"`
}

type ScopeItem struct {
	Asset string `json:"asset"`
	Type  string `json:"type"`
}

type BountyRow struct {
	Severity string `json:"severity"`
	Amount   string `json:"amount"`
}

var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

func main() {
	targetUrl := flag.String("url", "", "Program URL")
	htmlFile := flag.String("file", "", "Pre-rendered HTML file path")
	flag.Parse()

	if *targetUrl == "" {
		fail("URL is required")
		return
	}

	result := ParsedProgram{Success: true, URL: *targetUrl, Platform: "Universal Scanner"}
	
	// Fast-track HackerOne to GraphQL to ensure 100% zero-false-positives
	if strings.Contains(*targetUrl, "hackerone.com") {
		parseHackerOne(*targetUrl, &result)
		out, _ := json.Marshal(result)
		fmt.Println(string(out))
		return
	}

	var body string
	if *htmlFile != "" {
		b, errFile := os.ReadFile(*htmlFile)
		if errFile != nil {
			fail("Failed to read HTML file: " + errFile.Error())
			return
		}
		body = string(b)
	} else {
		var err error
		body, err = fetchHTML(*targetUrl)
		if err != nil {
			fail("Failed to fetch URL: " + err.Error())
			return
		}
	}

	parseGeneric(body, &result, *targetUrl)

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}

func fail(msg string) {
	out, _ := json.Marshal(ParsedProgram{Success: false, Error: msg})
	fmt.Println(string(out))
	os.Exit(1)
}

func fetchHTML(urlStr string) (string, error) {
	req, _ := http.NewRequest("GET", urlStr, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func stripTags(html string) string {
	jsonText := ""
	jsonRe := regexp.MustCompile(`(?s)<script[^>]*>.*?({".*?}).*?</script>`)
	matches := jsonRe.FindAllStringSubmatch(html, -1)
	for _, m := range matches {
		clean := regexp.MustCompile(`[{"}\]\[\\]+`).ReplaceAllString(m[1], " ")
		jsonText += clean + "\n"
	}
	reScript := regexp.MustCompile(`(?s)<script.*?>.*?</script>`)
	html = reScript.ReplaceAllString(html, " ")
	reStyle := regexp.MustCompile(`(?s)<style.*?>.*?</style>`)
	html = reStyle.ReplaceAllString(html, " ")
	reTag := regexp.MustCompile(`<[^>]*>`)
	html = reTag.ReplaceAllString(html, " ")
	reSpace := regexp.MustCompile(`\s+`)
	html = reSpace.ReplaceAllString(html, " ")
	return strings.TrimSpace(html) + "\n" + jsonText
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func parseGeneric(html string, result *ParsedProgram, urlStr string) {
	parts := strings.Split(strings.TrimRight(urlStr, "/"), "/")
	result.ProgramName = strings.Title(parts[len(parts)-1])

	text := stripTags(html)

	domainRe := regexp.MustCompile(`(?i)(?:\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b`)
	domains := domainRe.FindAllString(text, -1)
	seen := map[string]bool{}
	for _, d := range domains {
		d = strings.ToLower(d)
		if seen[d] { continue }
		seen[d] = true
		if len(d) < 5 || !strings.Contains(d, ".") { continue }
		if strings.Contains(d, "hackerone.com") || strings.Contains(d, "bugcrowd.com") || strings.Contains(d, "w3.org") || strings.Contains(d, "schema.org") { continue }
		
		exts := []string{".png", ".jpg", ".jpeg", ".gif", ".css", ".js", ".svg", ".woff", ".woff2", ".ttf", ".html", ".ico", ".json", ".xml", ".txt"}
		isNoise := false
		for _, ext := range exts {
			if strings.HasSuffix(d, ext) { isNoise = true; break }
		}
		if isNoise { continue }

		itemType := "URL"
		if strings.HasPrefix(d, "*.") { itemType = "WILDCARD" }
		result.InScope = append(result.InScope, ScopeItem{Asset: d, Type: itemType})
	}

	policyRe := regexp.MustCompile(`(?i)(?:Policy|Guidelines|Program Rules|About Us|Overview|Description|Rules|Scope)[\s=:-]+(.{100,1500}?)(?:\b(?:Out of Scope|Scope Exclusions|In Scope|Bounty|Rewards|Vulnerabilities)\b|$)`)
	mPolicy := policyRe.FindStringSubmatch(text)
	if len(mPolicy) > 1 {
		result.Policy = strings.TrimSpace(mPolicy[1])
	} else {
		pRe := regexp.MustCompile(`([A-Z][^.?!]{80,}[.?!])`)
		sentences := pRe.FindAllString(text, 8)
		if len(sentences) > 0 {
			result.Policy = strings.Join(sentences, "\n\n")
		} else {
			result.Policy = "Could not cleanly extract policy text."
		}
	}

	oosRe := regexp.MustCompile(`(?i)(?:Out of Scope|Scope Exclusions|Ineligible|Not in scope)[\s=:-]+(.{30,1000}?)(?:\b(?:Policy|In Scope|Bounty|Rewards|Terms)\b|$)`)
	mOos := oosRe.FindStringSubmatch(text)
	if len(mOos) > 1 {
		oosText := strings.TrimSpace(mOos[1])
		if len(oosText) > 0 {
			result.OutOfScope = append(result.OutOfScope, ScopeItem{Asset: oosText[:min(len(oosText), 400)] + "...", Type: "RULE"})
		}
	}

	severities := []string{"Critical", "High", "Medium", "Low"}
	var bountyTable []BountyRow
	for _, sev := range severities {
		bRe := regexp.MustCompile(`(?i)\b` + sev + `\b.{0,100}?\$([0-9,]+)`)
		mB := bRe.FindStringSubmatch(text)
		if len(mB) > 1 {
			bountyTable = append(bountyTable, BountyRow{Severity: sev, Amount: "$" + mB[1]})
		}
	}
	
	if len(bountyTable) > 0 {
		result.BountyTable = bountyTable
	} else {
		result.BountyTable = []BountyRow{
			{Severity: "Critical", Amount: "See Page"},
			{Severity: "High", Amount: "See Page"},
			{Severity: "Medium", Amount: "See Page"},
			{Severity: "Low", Amount: "See Page"},
		}
	}
}

func parseHackerOne(urlStr string, result *ParsedProgram) {
	result.Platform = "HackerOne"
	parts := strings.Split(strings.Split(urlStr, "?")[0], "/")
	handle := parts[len(parts)-1]
	if handle == "" || handle == "policy_scopes" {
		if len(parts) > 2 { handle = parts[len(parts)-2] }
	}
	result.ProgramName = strings.Title(handle)

	// Fetch Policy using Graphql 'policy' instead of 'about'
	qPolicy := `{"query":"query TeamScope($handle: String!) { team(handle: $handle) { policy offers_bounties } }","variables":{"handle":"` + handle + `"}}`
	req, _ := http.NewRequest("POST", "https://hackerone.com/graphql", strings.NewReader(qPolicy))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0")
	req.Header.Set("X-CSRF-Token", "fake")
	
	var policyText string
	resp, err := httpClient.Do(req)
	if err == nil {
		b, _ := io.ReadAll(resp.Body)
		var gql struct { Data struct { Team struct { Policy string `json:"policy"` } } }
		json.Unmarshal(b, &gql)
		policyText = gql.Data.Team.Policy
		resp.Body.Close()
	}

	if policyText != "" {
		result.Policy = policyText[:min(len(policyText), 3000)]
	} else {
		result.Policy = "Please see the HackerOne page for full policy details."
	}

	// Fetch Scopes using structured_scopes
	qScopes := `{"query":"query TeamScope($handle: String!) { team(handle: $handle) { in_scope_assets: structured_scopes(search: \"\", archived: false, eligible_for_bounty: true) { edges { node { asset_identifier asset_type max_severity } } } out_of_scope_assets: structured_scopes(search: \"\", archived: false, eligible_for_bounty: false) { edges { node { asset_identifier asset_type } } } } }","variables":{"handle":"` + handle + `"}}`
	req2, _ := http.NewRequest("POST", "https://hackerone.com/graphql", strings.NewReader(qScopes))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("User-Agent", "Mozilla/5.0")
	req2.Header.Set("X-CSRF-Token", "fake")
	
	resp2, err2 := httpClient.Do(req2)
	if err2 == nil {
		b2, _ := io.ReadAll(resp2.Body)
		var gql2 struct {
			Data struct {
				Team struct {
					InScopeAssets struct { Edges []struct { Node struct { AssetIdentifier string `json:"asset_identifier"`; AssetType string `json:"asset_type"` } } } `json:"in_scope_assets"`
					OutOfScopeAssets struct { Edges []struct { Node struct { AssetIdentifier string `json:"asset_identifier"`; AssetType string `json:"asset_type"` } } } `json:"out_of_scope_assets"`
				}
			}
		}
		json.Unmarshal(b2, &gql2)
		for _, e := range gql2.Data.Team.InScopeAssets.Edges {
			result.InScope = append(result.InScope, ScopeItem{Asset: e.Node.AssetIdentifier, Type: e.Node.AssetType})
		}
		for _, e := range gql2.Data.Team.OutOfScopeAssets.Edges {
			result.OutOfScope = append(result.OutOfScope, ScopeItem{Asset: e.Node.AssetIdentifier, Type: e.Node.AssetType})
		}
		resp2.Body.Close()
	}

	// Bounties
	result.BountyTable = []BountyRow{
		{Severity: "Critical", Amount: "See Page"},
		{Severity: "High", Amount: "See Page"},
		{Severity: "Medium", Amount: "See Page"},
		{Severity: "Low", Amount: "See Page"},
	}
}
