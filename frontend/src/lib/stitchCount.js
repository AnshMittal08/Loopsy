// Pull the declared stitch count out of "(24 stitches)" for row chips and the
// Crochet Mode readout.
export function stitchCountOf(instruction = '') {
  const m = instruction.match(/\((\d+)\s*(?:stitches|sts|chains)/i);
  return m ? parseInt(m[1], 10) : null;
}
