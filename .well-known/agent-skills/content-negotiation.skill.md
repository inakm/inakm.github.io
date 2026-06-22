# Markdown Content Negotiation

This site supports `Accept: text/markdown` content negotiation for all HTML pages.

## How to Use

Include the following header in your HTTP request:

```
Accept: text/markdown
```

The server will return a markdown representation of the page with:

- `Content-Type: text/markdown`
- `x-markdown-tokens` with the estimated token count

## Response Format

Responses follow this structure:

1. YAML frontmatter with title, description (when available)
2. Body content converted to markdown
3. JSON-LD structured data preserved as a fenced code block

## Benefits

- Reduced token usage compared to HTML
- Clean, structured content for AI processing
- Consistent format across all pages
