package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

type GeoResult struct {
	IP          string  `json:"ip"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Region      string  `json:"region"`
	RegionName  string  `json:"regionName"`
	City        string  `json:"city"`
	Zip         string  `json:"zip"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Timezone    string  `json:"timezone"`
	ISP         string  `json:"isp"`
	Org         string  `json:"org"`
	AS          string  `json:"as"`
	Mobile      bool    `json:"mobile"`
	Proxy       bool    `json:"proxy"`
	Hosting     bool    `json:"hosting"`
	Status      string  `json:"status"`
	Message     string  `json:"message"`
}

type DNSInfo struct {
	Hostname string   `json:"hostname"`
	Reverse  []string `json:"reverse"`
}

type Output struct {
	Success  bool      `json:"success"`
	Geo      GeoResult `json:"geo"`
	DNS      DNSInfo   `json:"dns"`
	Ports    []int     `json:"ports,omitempty"`
	Error    string    `json:"error,omitempty"`
}

func main() {
	target := flag.String("ip", "", "Target IP address or domain")
	scanPorts := flag.Bool("ports", false, "Scan common ports")
	flag.Parse()

	if *target == "" {
		out, _ := json.Marshal(Output{Success: false, Error: "IP or domain is required"})
		fmt.Println(string(out))
		return
	}

	ip := *target
	// Resolve domain to IP if needed
	if net.ParseIP(ip) == nil {
		ips, err := net.LookupIP(ip)
		if err != nil || len(ips) == 0 {
			out, _ := json.Marshal(Output{Success: false, Error: "Could not resolve domain: " + ip})
			fmt.Println(string(out))
			return
		}
		// Prefer IPv4 addresses for geolocation API compatibility
		resolved := ""
		for _, addr := range ips {
			if addr.To4() != nil {
				resolved = addr.String()
				break
			}
		}
		if resolved == "" {
			resolved = ips[0].String() // fallback to IPv6 if no IPv4
		}
		ip = resolved
	}

	// Fetch geolocation from ip-api.com
	client := &http.Client{Timeout: 10 * time.Second}
	apiURL := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query", ip)
	resp, err := client.Get(apiURL)
	if err != nil {
		out, _ := json.Marshal(Output{Success: false, Error: "API request failed: " + err.Error()})
		fmt.Println(string(out))
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var geo GeoResult
	json.Unmarshal(body, &geo)

	if geo.Status == "fail" {
		out, _ := json.Marshal(Output{Success: false, Error: "Lookup failed: " + geo.Message})
		fmt.Println(string(out))
		return
	}
	geo.IP = ip

	// DNS reverse lookup
	dns := DNSInfo{}
	names, err := net.LookupAddr(ip)
	if err == nil && len(names) > 0 {
		dns.Hostname = strings.TrimSuffix(names[0], ".")
		for _, n := range names {
			dns.Reverse = append(dns.Reverse, strings.TrimSuffix(n, "."))
		}
	}

	result := Output{Success: true, Geo: geo, DNS: dns}

	// Quick port scan if requested
	if *scanPorts {
		commonPorts := []int{21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017}
		var openPorts []int
		for _, port := range commonPorts {
			addr := fmt.Sprintf("%s:%d", ip, port)
			conn, err := net.DialTimeout("tcp", addr, 800*time.Millisecond)
			if err == nil {
				conn.Close()
				openPorts = append(openPorts, port)
			}
		}
		result.Ports = openPorts
	}

	out, _ := json.Marshal(result)
	fmt.Println(string(out))
}
