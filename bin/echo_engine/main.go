package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/projectdiscovery/interactsh/pkg/client"
	"github.com/projectdiscovery/interactsh/pkg/server"
)

type InteractionOutput struct {
	Type          string `json:"type"` // "interaction"
	Protocol      string `json:"protocol"`
	QueryType     string `json:"query_type,omitempty"`
	RawRequest    string `json:"raw_request"`
	RemoteAddress string `json:"remote_address"`
	Timestamp     string `json:"timestamp"`
}

type InitOutput struct {
	Type string `json:"type"` // "init"
	URL  string `json:"url"`
}

type ErrorOutput struct {
	Type  string `json:"type"` // "error"
	Error string `json:"error"`
}

func main() {
	// Disable default log output so we only spit out JSON to stdout
	log.SetOutput(os.Stderr)

	c, err := client.New(&client.Options{
		ServerURL: "https://interact.sh",
	})
	if err != nil {
		printErrorAndExit(fmt.Sprintf("Could not create client: %v", err))
	}

	err = c.StartPolling(1*time.Second, func(interaction *server.Interaction) {
		out := InteractionOutput{
			Type:          "interaction",
			Protocol:      interaction.Protocol,
			QueryType:     interaction.QType,
			RawRequest:    interaction.RawRequest,
			RemoteAddress: interaction.RemoteAddress,
			Timestamp:     interaction.Timestamp.String(),
		}
		b, _ := json.Marshal(out)
		fmt.Println(string(b))
	})
	
	if err != nil {
		printErrorAndExit(fmt.Sprintf("Could not start polling: %v", err))
	}

	defer c.StopPolling()
	defer c.Close()

	// Print the generated URL immediately
	initOut := InitOutput{
		Type: "init",
		URL:  c.URL(),
	}
	b, _ := json.Marshal(initOut)
	fmt.Println(string(b))

	// Wait for interrupt
	cWait := make(chan os.Signal, 1)
	signal.Notify(cWait, os.Interrupt)
	<-cWait
}

func printErrorAndExit(msg string) {
	out := ErrorOutput{
		Type:  "error",
		Error: msg,
	}
	b, _ := json.Marshal(out)
	fmt.Println(string(b))
	os.Exit(1)
}
