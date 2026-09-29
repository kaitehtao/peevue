// Remove metadata at the server boundary, including EXIF GPS and JPEG comments.
export function sanitizeJpeg(input: Uint8Array): Uint8Array {
  if (
    input.length < 4 ||
    input.length > 2 * 1024 * 1024 ||
    input[0] !== 255 ||
    input[1] !== 216
  )
    throw new Error("Choose a JPEG photo smaller than 2 MB after resizing.");
  const chunks: Uint8Array[] = [input.slice(0, 2)];
  let i = 2,
    frame = false,
    scan = false,
    ended = false;
  while (i < input.length) {
    const start = i;
    if (input[i++] !== 255) throw new Error("Invalid JPEG photo.");
    while (input[i] === 255) i++;
    const marker = input[i++];
    if (marker === 217) {
      chunks.push(new Uint8Array([255, 217]));
      ended = true;
      break;
    }
    if (marker === 0 || marker === 216 || marker === undefined)
      throw new Error("Invalid JPEG photo.");
    const length = (input[i] << 8) | input[i + 1];
    if (length < 2 || i + length > input.length)
      throw new Error("Invalid JPEG photo.");
    if ([192, 193, 194].includes(marker)) {
      const height = (input[i + 3] << 8) | input[i + 4],
        width = (input[i + 5] << 8) | input[i + 6];
      if (length < 8 || !width || !height || width * height > 12000000)
        throw new Error("Photo dimensions are too large.");
      frame = true;
    }
    i += length;
    if (!(marker >= 224 && marker <= 239) && marker !== 254)
      chunks.push(input.slice(start, i));
    if (marker === 218) {
      scan = true;
      const begin = i;
      while (i < input.length) {
        if (
          input[i] === 255 &&
          input[i + 1] !== 0 &&
          !(input[i + 1] >= 208 && input[i + 1] <= 215)
        )
          break;
        i += input[i] === 255 ? 2 : 1;
      }
      chunks.push(input.slice(begin, i));
    }
  }
  if (!frame || !scan || !ended)
    throw new Error("Invalid or incomplete JPEG photo.");
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
