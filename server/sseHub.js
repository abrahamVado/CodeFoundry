//1.- Maintain a map of connected SSE clients per run identifier.
class MessageStreamHub {
  constructor() {
    this.clients = new Map();
  }

  //2.- Register a new SSE response and send the initial headers.
  register(runId, res) {
    const id = Number(runId);
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    };
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.write(":connected\n\n");

    if (!this.clients.has(id)) {
      this.clients.set(id, new Set());
    }
    const bucket = this.clients.get(id);
    bucket.add(res);

    return () => {
      bucket.delete(res);
      if (bucket.size === 0) {
        this.clients.delete(id);
      }
      try {
        res.end();
      } catch (err) {
        // Ignore double end issues.
      }
    };
  }

  //3.- Broadcast a snapshot to every client listening to the run.
  sendSnapshot(runId, messages, targetResponse) {
    const bucket = targetResponse
      ? new Set([targetResponse])
      : this.clients.get(Number(runId));
    if (!bucket?.size) return;
    const payload = JSON.stringify({ type: "snapshot", messages });
    bucket.forEach((res) => res.write(`data: ${payload}\n\n`));
  }

  //4.- Broadcast a single appended message.
  sendAppend(runId, message) {
    const bucket = this.clients.get(Number(runId));
    if (!bucket?.size) return;
    const payload = JSON.stringify({ type: "append", message });
    bucket.forEach((res) => res.write(`data: ${payload}\n\n`));
  }
}

module.exports = { MessageStreamHub };
