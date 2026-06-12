// Reads the server-sent-event stream from POST /api/ai/generate-pattern
// (stream: true). Events: `status` (pipeline stage), `step` (a computed row),
// `pattern` (the final saved record), `error`.

export async function readGenerationStream(res, { onStatus, onStep } = {}) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let pattern = null;

  const handleBlock = (block) => {
    let event = 'message';
    const dataLines = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    const data = JSON.parse(dataLines.join('\n'));

    if (event === 'status') onStatus?.(data);
    else if (event === 'step') onStep?.(data);
    else if (event === 'pattern') pattern = data;
    else if (event === 'error') throw new Error(data.error || 'Generation failed');
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.trim()) handleBlock(block);
    }
  }
  if (buffer.trim()) handleBlock(buffer);

  if (!pattern) throw new Error('The generation stream ended unexpectedly. Please try again.');
  return pattern;
}
