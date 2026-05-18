# Table settings.

We should be able to decide which attributes to show. let's use react-table to improve this. For now, let's save that information of what to show in the localstorage.

For this we will need to introduce a state management lib such as zustand with the plugin to save to localstorage.

Follow the same arch decisions, let's create a useSettings hook that will get things from the localstorage.

Based on the selected fields, we need to also change the BFF to sends fields that we are going to show, so we don't send all of the attributes. We rather filter on the backend so we reduce latency.
