# Filtering/Flattening and Next Steps

- Remove the max amount of 20 items.
- Now that the data is shown but the structure of the response is not ideal. We can move onto enhancing the BFF to flatening and filtering the data.
- Create also the right indexes (In memory) depending on the params provided, so we can reply with the flatten version of the response a bit faster. (Later we could cache common queries as well)
