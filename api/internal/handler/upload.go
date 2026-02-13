package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

const maxUploadSize = 50 << 20 // 50 MB

type UploadResponse struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Path     string `json:"path"`
}

func UploadHandler(uploadDir string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
		if err := r.ParseMultipartForm(maxUploadSize); err != nil {
			http.Error(w, `{"error":"file too large"}`, http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, `{"error":"missing file field"}`, http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Sanitize filename
		origName := filepath.Base(header.Filename)
		ext := filepath.Ext(origName)
		id := uuid.New().String()
		datePath := time.Now().Format("2006/01/02")
		destDir := filepath.Join(uploadDir, datePath)

		if err := os.MkdirAll(destDir, 0750); err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"create directory: %s"}`, err), http.StatusInternalServerError)
			return
		}

		safeName := id + sanitizeExt(ext)
		destPath := filepath.Join(destDir, safeName)

		dst, err := os.Create(destPath)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"create file: %s"}`, err), http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		written, err := io.Copy(dst, file)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"write file: %s"}`, err), http.StatusInternalServerError)
			return
		}

		resp := UploadResponse{
			ID:       id,
			Filename: origName,
			Size:     written,
			Path:     filepath.Join(datePath, safeName),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(resp)
	}
}

func sanitizeExt(ext string) string {
	ext = strings.ToLower(ext)
	if ext == "" {
		return ""
	}
	// Only allow alphanumeric extensions
	clean := strings.Builder{}
	clean.WriteByte('.')
	for _, c := range ext[1:] {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			clean.WriteRune(c)
		}
	}
	if clean.Len() == 1 {
		return ""
	}
	return clean.String()
}
