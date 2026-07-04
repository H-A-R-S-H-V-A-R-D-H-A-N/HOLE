package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type OSVQuery struct {
	Version string `json:"version"`
	Package struct {
		Name string `json:"name"`
	} `json:"package"`
}
type OSVBatchRequest struct {
	Queries []OSVQuery `json:"queries"`
}
type OSVResponse struct {
	Results []struct {
		Vulns []struct {
			ID       string   `json:"id"`
			Summary  string   `json:"summary"`
			Details  string   `json:"details"`
			Aliases  []string `json:"aliases"`
			Severity []struct {
				Type  string `json:"type"`
				Score string `json:"score"`
			} `json:"severity"`
			Affected []struct {
				Package struct {
					Name string `json:"name"`
				} `json:"package"`
				Ranges []struct {
					Events []map[string]string `json:"events"`
				} `json:"ranges"`
			} `json:"affected"`
			DatabaseSpecific struct {
				CweIDs   []string `json:"cwe_ids"`
				Severity string   `json:"severity"`
			} `json:"database_specific"`
			References []struct {
				Type string `json:"type"`
				URL  string `json:"url"`
			} `json:"references"`
		} `json:"vulns"`
	} `json:"results"`
}

type NVDResponse struct {
	Vulnerabilities []struct {
		CVE struct {
			ID           string `json:"id"`
			Descriptions []struct {
				Lang  string `json:"lang"`
				Value string `json:"value"`
			} `json:"descriptions"`
			Weaknesses []struct {
				Description []struct {
					Value string `json:"value"`
				} `json:"description"`
			} `json:"weaknesses"`
			Metrics struct {
				CvssMetricV31 []struct {
					CvssData struct {
						BaseScore             float64 `json:"baseScore"`
						BaseSeverity          string  `json:"baseSeverity"`
						VectorString          string  `json:"vectorString"`
						AttackVector          string  `json:"attackVector"`
						AttackComplexity      string  `json:"attackComplexity"`
						PrivilegesRequired    string  `json:"privilegesRequired"`
						UserInteraction       string  `json:"userInteraction"`
						Scope                 string  `json:"scope"`
						ConfidentialityImpact string  `json:"confidentialityImpact"`
						IntegrityImpact       string  `json:"integrityImpact"`
						AvailabilityImpact    string  `json:"availabilityImpact"`
					} `json:"cvssData"`
				} `json:"cvssMetricV31"`
			} `json:"metrics"`
			References []struct {
				URL string `json:"url"`
			} `json:"references"`
		} `json:"cve"`
	} `json:"vulnerabilities"`
}

type CVSSMetrics struct {
	AttackVector       string `json:"attackVector"`
	AttackComplexity   string `json:"attackComplexity"`
	PrivilegesRequired string `json:"privilegesRequired"`
	UserInteraction    string `json:"userInteraction"`
	Scope              string `json:"scope"`
	Confidentiality    string `json:"confidentiality"`
	Integrity          string `json:"integrity"`
	Availability       string `json:"availability"`
}

type OutputCVE struct {
	ID               string      `json:"id"`
	Title            string      `json:"title"`
	Description      string      `json:"description"`
	Severity         string      `json:"severity"`
	Score            float64     `json:"score"`
	CVSSVector       string      `json:"cvssVector"`
	CVSSMetrics      CVSSMetrics `json:"cvssMetrics"`
	AffectedVersions string      `json:"affectedVersions"`
	PatchedVersions  string      `json:"patchedVersions"`
	CWEs             []string    `json:"cwes"`
	References       []string    `json:"references"`
	Source           string      `json:"source"`
}

func main() {
	service := flag.String("service", "", "Service name")
	version := flag.String("version", "", "Version number")
	flag.Parse()

	if *service == "" || *version == "" {
		printError("Both --service and --version are required")
		return
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	vulnMap := make(map[string]OutputCVE)

	wg.Add(2)
	go func() { defer wg.Done(); fetchNVD(*service, *version, &mu, vulnMap) }()
	go func() { defer wg.Done(); fetchOSV(*service, *version, &mu, vulnMap) }()
	wg.Wait()

	var results []OutputCVE
	for _, v := range vulnMap {
		results = append(results, v)
	}
	outBytes, _ := json.Marshal(results)
	fmt.Println(string(outBytes))
}

func fetchNVD(service, version string, mu *sync.Mutex, vulnMap map[string]OutputCVE) {
	keyword := fmt.Sprintf("%s %s", service, version)
	apiURL := fmt.Sprintf("https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=%s", url.QueryEscape(keyword))

	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var nvdResp NVDResponse
	json.Unmarshal(body, &nvdResp)

	mu.Lock()
	defer mu.Unlock()

	for _, v := range nvdResp.Vulnerabilities {
		cve := v.CVE
		desc := ""
		for _, d := range cve.Descriptions {
			if d.Lang == "en" {
				desc = d.Value
				break
			}
		}

		var score float64
		severity := "UNKNOWN"
		vector := ""
		metrics := CVSSMetrics{}

		if len(cve.Metrics.CvssMetricV31) > 0 {
			m := cve.Metrics.CvssMetricV31[0].CvssData
			score = m.BaseScore
			severity = m.BaseSeverity
			vector = m.VectorString
			metrics = CVSSMetrics{
				AttackVector:       m.AttackVector,
				AttackComplexity:   m.AttackComplexity,
				PrivilegesRequired: m.PrivilegesRequired,
				UserInteraction:    m.UserInteraction,
				Scope:              m.Scope,
				Confidentiality:    m.ConfidentialityImpact,
				Integrity:          m.IntegrityImpact,
				Availability:       m.AvailabilityImpact,
			}
		}

		var cwes []string
		for _, w := range cve.Weaknesses {
			for _, d := range w.Description {
				if strings.HasPrefix(d.Value, "CWE-") {
					cwes = append(cwes, d.Value)
				}
			}
		}

		var refs []string
		for i, r := range cve.References {
			if i >= 8 {
				break
			}
			refs = append(refs, r.URL)
		}

		vulnMap[cve.ID] = OutputCVE{
			ID: cve.ID, Title: cve.ID, Description: desc,
			Score: score, Severity: severity, CVSSVector: vector,
			CVSSMetrics: metrics, CWEs: cwes, References: refs,
			AffectedVersions: "See description", PatchedVersions: "See description",
			Source: "NVD",
		}
	}
}

func fetchOSV(service, version string, mu *sync.Mutex, vulnMap map[string]OutputCVE) {
	variations := []string{service, strings.ToLower(service), strings.ReplaceAll(strings.ToLower(service), ".js", "")}
	var queries []OSVQuery
	for _, v := range variations {
		queries = append(queries, OSVQuery{Version: version, Package: struct {
			Name string `json:"name"`
		}{Name: v}})
	}

	batchReq := OSVBatchRequest{Queries: queries}
	reqBody, _ := json.Marshal(batchReq)

	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("POST", "https://api.osv.dev/v1/querybatch", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var osvResp OSVResponse
	json.Unmarshal(body, &osvResp)

	// Collect unique vuln IDs from batch results
	seenIDs := map[string]bool{}
	var vulnIDs []string
	for _, result := range osvResp.Results {
		for _, v := range result.Vulns {
			if !seenIDs[v.ID] {
				seenIDs[v.ID] = true
				vulnIDs = append(vulnIDs, v.ID)
			}
		}
	}

	// Fetch full details for each vulnerability individually
	var wg sync.WaitGroup
	for _, id := range vulnIDs {
		wg.Add(1)
		go func(vulnID string) {
			defer wg.Done()
			fetchOSVSingle(vulnID, client, mu, vulnMap)
		}(id)
	}
	wg.Wait()
}

// Fetch full details for a single OSV vulnerability
func fetchOSVSingle(vulnID string, client *http.Client, mu *sync.Mutex, vulnMap map[string]OutputCVE) {
	apiURL := fmt.Sprintf("https://api.osv.dev/v1/vulns/%s", vulnID)
	resp, err := client.Get(apiURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var v struct {
		ID       string   `json:"id"`
		Summary  string   `json:"summary"`
		Details  string   `json:"details"`
		Aliases  []string `json:"aliases"`
		Severity []struct {
			Type  string `json:"type"`
			Score string `json:"score"`
		} `json:"severity"`
		Affected []struct {
			Package struct {
				Name string `json:"name"`
			} `json:"package"`
			Ranges []struct {
				Events []map[string]string `json:"events"`
			} `json:"ranges"`
		} `json:"affected"`
		DatabaseSpecific struct {
			CweIDs   []string `json:"cwe_ids"`
			Severity string   `json:"severity"`
		} `json:"database_specific"`
		References []struct {
			Type string `json:"type"`
			URL  string `json:"url"`
		} `json:"references"`
	}
	json.Unmarshal(body, &v)

	displayID := v.ID
	for _, alias := range v.Aliases {
		if strings.HasPrefix(alias, "CVE-") {
			displayID = alias
			break
		}
	}

	mu.Lock()
	defer mu.Unlock()

	// If NVD already has this CVE, MERGE the OSV data into it
	if existing, exists := vulnMap[displayID]; exists {
		affected, patched := parseOSVVersions(v.Affected)
		existing.AffectedVersions = affected
		existing.PatchedVersions = patched
		if existing.Description == "" && v.Details != "" {
			existing.Description = v.Details
		}
		if len(existing.CWEs) == 0 && len(v.DatabaseSpecific.CweIDs) > 0 {
			existing.CWEs = v.DatabaseSpecific.CweIDs
		}
		if existing.Title == existing.ID && v.Summary != "" {
			existing.Title = v.Summary
		}
		vulnMap[displayID] = existing
		return
	}

	title := v.Summary
	if title == "" { title = displayID }
	desc := v.Details
	if desc == "" { desc = v.Summary }

	severity := "HIGH"
	var score float64 = 7.5
	vector := ""
	if v.DatabaseSpecific.Severity != "" {
		severity = strings.ToUpper(v.DatabaseSpecific.Severity)
		switch severity {
		case "CRITICAL": score = 9.5
		case "HIGH": score = 7.5
		case "MODERATE", "MEDIUM": score = 5.5; severity = "MEDIUM"
		case "LOW": score = 3.0
		}
	}
	for _, sev := range v.Severity {
		if sev.Type == "CVSS_V3" || sev.Type == "CVSS_V31" {
			vector = sev.Score
		}
	}

	affected, patched := parseOSVVersions(v.Affected)

	var cwes []string
	cwes = append(cwes, v.DatabaseSpecific.CweIDs...)

	var refs []string
	for i, r := range v.References {
		if i >= 8 { break }
		refs = append(refs, r.URL)
	}

	vulnMap[displayID] = OutputCVE{
		ID: displayID, Title: title, Description: desc,
		Score: score, Severity: severity, CVSSVector: vector,
		CVSSMetrics: CVSSMetrics{}, CWEs: cwes, References: refs,
		AffectedVersions: affected, PatchedVersions: patched,
		Source: "OSV",
	}
}

func parseOSVVersions(affected []struct {
	Package struct {
		Name string `json:"name"`
	} `json:"package"`
	Ranges []struct {
		Events []map[string]string `json:"events"`
	} `json:"ranges"`
}) (string, string) {
	var affParts, patchParts []string
	for _, aff := range affected {
		for _, rng := range aff.Ranges {
			intro := ""
			for _, ev := range rng.Events {
				if v, ok := ev["introduced"]; ok {
					intro = v
				}
				if v, ok := ev["fixed"]; ok {
					if intro != "" {
						affParts = append(affParts, fmt.Sprintf(">= %s, < %s", intro, v))
					}
					patchParts = append(patchParts, v)
				}
			}
			if intro != "" && len(patchParts) == 0 {
				affParts = append(affParts, fmt.Sprintf(">= %s (no fix available)", intro))
			}
		}
	}
	affStr := strings.Join(affParts, " | ")
	if affStr == "" {
		affStr = "Unknown"
	}
	patchStr := strings.Join(patchParts, ", ")
	if patchStr == "" {
		patchStr = "No fix available"
	}
	return affStr, patchStr
}

func printError(msg string) {
	out, _ := json.Marshal(map[string]string{"error": msg})
	fmt.Println(string(out))
	os.Exit(1)
}
