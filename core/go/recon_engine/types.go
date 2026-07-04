package main

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

type Output struct {
	Success     bool            `json:"success"`
	Domain      string          `json:"domain"`
	Emails      []string        `json:"emails"`
	Subdomains  []SubdomainInfo `json:"subdomains"`
	URLs        []string        `json:"urls"`
	DNS         DNSRecords      `json:"dns"`
	Socials     []Social        `json:"socials"`
	RobotsTxt   []string        `json:"robotsTxt"`
	Sitemap     []string        `json:"sitemap"`
	TechStack   []string        `json:"techStack"`
	Whois       *WhoisInfo      `json:"whois,omitempty"`
	Headers     []HeaderCheck   `json:"securityHeaders,omitempty"`
	SSL         *SSLInfo        `json:"ssl,omitempty"`
	Ports       []PortResult    `json:"ports,omitempty"`
	ReverseIP   []string        `json:"reverseIP,omitempty"`
	GeoInfo     *GeoInfo        `json:"geoInfo,omitempty"`
	WAF         *WAFInfo        `json:"waf,omitempty"`
	Buckets     []BucketInfo    `json:"buckets,omitempty"`
	FaviconHash string          `json:"faviconHash,omitempty"`
	JSFiles     []JSFileInfo    `json:"jsFiles,omitempty"`
	Exposures   []ExposureInfo  `json:"exposures,omitempty"`
	WaybackURLs []string        `json:"waybackUrls,omitempty"`
	Error       string          `json:"error,omitempty"`
}

type SubdomainInfo struct {
	Name        string `json:"name"`
	Status      int    `json:"status"`
	StatusText  string `json:"statusText"`
	CNAME       string `json:"cname,omitempty"`
	Takeover    bool   `json:"takeover"`
	TakeoverSvc string `json:"takeoverSvc,omitempty"`
	Confidence  string `json:"confidence,omitempty"`
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

type WhoisInfo struct {
	Registrar   string `json:"registrar"`
	CreatedDate string `json:"createdDate"`
	ExpiryDate  string `json:"expiryDate"`
	UpdatedDate string `json:"updatedDate"`
	NameServers []string `json:"nameServers"`
	Org         string `json:"org"`
	Country     string `json:"country"`
	DnsSec      string `json:"dnsSec"`
}

type HeaderCheck struct {
	Name    string `json:"name"`
	Present bool   `json:"present"`
	Value   string `json:"value,omitempty"`
	Severity string `json:"severity"`
}

type SSLInfo struct {
	Issuer     string   `json:"issuer"`
	Subject    string   `json:"subject"`
	SANs       []string `json:"sans"`
	NotBefore  string   `json:"notBefore"`
	NotAfter   string   `json:"notAfter"`
	Protocol   string   `json:"protocol"`
	Serial     string   `json:"serial"`
}

type PortResult struct {
	Port    int    `json:"port"`
	State   string `json:"state"`
	Service string `json:"service"`
}

type GeoInfo struct {
	IP      string `json:"ip"`
	Country string `json:"country"`
	Region  string `json:"region"`
	City    string `json:"city"`
	ISP     string `json:"isp"`
	Org     string `json:"org"`
	AS      string `json:"as"`
}

type WAFInfo struct {
	Detected bool   `json:"detected"`
	Name     string `json:"name"`
}

type BucketInfo struct {
	URL      string `json:"url"`
	IsPublic bool   `json:"isPublic"`
}

type JSFileInfo struct {
	URL       string   `json:"url"`
	Endpoints []string `json:"endpoints"`
	Secrets   []string `json:"secrets"`
}

type ExposureInfo struct {
	URL    string `json:"url"`
	Type   string `json:"type"`
	Status int    `json:"status"`
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
		if len(via) >= 3 { return http.ErrUseLastResponse }
		return nil
	},
}

// Known port-to-service mapping
var portServiceMap = map[int]string{
	21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
	80: "HTTP", 110: "POP3", 111: "RPCBind", 135: "MSRPC", 139: "NetBIOS",
	143: "IMAP", 443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S",
	1433: "MSSQL", 1521: "Oracle", 3306: "MySQL", 3389: "RDP",
	5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 8080: "HTTP-Proxy",
	8443: "HTTPS-Alt", 8888: "HTTP-Alt", 9200: "Elasticsearch",
	27017: "MongoDB",
}
