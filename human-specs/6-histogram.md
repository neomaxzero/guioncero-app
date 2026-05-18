# Histogram

Aside from the table, we would like to present a histogram of the logs we are seeing on the current timeframe. These should be stacked bars with the different severeties that follow the same color-code as the table. Let's use shadcn charts table.

- Let's make a grouping coherent with the timeframe of the logs.
- Create a new endpoint to receive the data for the histogram.
- The call to histogram api should be independent of what's in the table: `/api/logs/histogram`
