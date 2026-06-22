# Portfolio Browsing

Browse the financial portfolio of Anjani Kumar Mishra, including financial models,
PowerBI dashboards, and analytics projects.

## Endpoints

### List Projects
```
GET /page/projects/
```

Returns an index of all project categories (financial-models, dashboards, etc.).

### View Project
```
GET /page/projects/{category}/{project}.html
```

Returns the HTML page for a specific project. Request with `Accept: text/markdown`
to get a markdown version.

### LLM Discovery
```
GET /llms.txt
```

Returns a concise LLM-friendly index of all site resources.
