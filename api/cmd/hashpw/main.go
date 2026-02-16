package main

import (
	"fmt"
	"os"

	"github.com/jmcintyre/secbase/api/internal/auth"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: hashpw <password>")
		os.Exit(1)
	}
	hash, err := auth.HashPassword(os.Args[1])
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(hash)
}
