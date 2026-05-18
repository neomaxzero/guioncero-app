# grouping logs

Grouping logs is a way to see an aggregation of logs per service or any other relevant metric. We'd like to start by adding an aggregation based out of services. The group is organized by parent resource with collapsible groups.

For this:

- Add a toggle button between a log view and a grouped view.
- By tapping the button we will show in the table an aggregation of the logs in that timeframe per services
- configurable columns (similar to the detailed view)
- Columns:
  - service/artifact name. (each with a color), define a pastel-like palette randomly based on the name of the service with a deterministic algo based on the name (hashlike)
  - count of the amount of logs that belong to that service.
  - error
  - warn
  - info

- Histogram. The histogram should also respond to this aggregation so it shows each service aggregated (resembled the table), but no hover.
