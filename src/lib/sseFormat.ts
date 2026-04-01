/**
 * Formats a Server-Sent Events message according to the SSE specification.
 *
 * @param event - The event type name
 * @param data  - The payload to JSON-serialize into the data field
 * @param id    - The event ID (typically a timestamp)
 */
export function formatSSEMessage(
  event: string,
  data: unknown,
  id: string,
): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
