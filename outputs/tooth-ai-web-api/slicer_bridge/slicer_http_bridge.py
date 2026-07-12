from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer


HOST = "127.0.0.1"
PORT = 18901


class SlicerBridgeHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send_json({"status": "ok", "app": "3D Slicer bridge"})
            return
        self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path != "/load-image":
            self._send_json({"error": "not found"}, 404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        image_path = payload.get("path")
        if not image_path:
            self._send_json({"error": "missing path"}, 400)
            return
        try:
            import slicer

            loaded, node = slicer.util.loadVolume(image_path, returnNode=True)
            if not loaded:
                loaded, node = slicer.util.loadModel(image_path, returnNode=True)
            if not loaded:
                self._send_json({"loaded": False, "path": image_path}, 422)
                return
            slicer.util.setSliceViewerLayers(background=node)
            slicer.util.resetSliceViews()
            self._send_json({
                "loaded": True,
                "path": image_path,
                "node_id": node.GetID(),
                "node_name": node.GetName(),
            })
        except Exception as exc:
            self._send_json({"loaded": False, "path": image_path, "error": str(exc)}, 500)


def start_server():
    server = HTTPServer((HOST, PORT), SlicerBridgeHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"3D Slicer bridge running at http://{HOST}:{PORT}")
    return server


server = start_server()
