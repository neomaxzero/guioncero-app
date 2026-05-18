## Design decisions

- UI will immediately show the shell of the App and request the initial logs through the proxy.
- Data will be aggregated and computed on the BFF as a proxy to the backend endpoint before returning to the client.

## Layers in the Frontend

### 1. Data providers hooks

- This will be connected to specific resources and these hooks will understand where/how to fetch information. it will be sort of the repository layer of the app, these hook would be universal (client/server compatible), although we will use most of them in the frontend. Its responsibility is to type the data from the endpoints and do almost no manipulation unless it's very useful to have data sanitised/filtered for the rest of the app.

### 2. Components Hooks

- Shaping the data to adapt to the needs of components and what they need to show. These will contain the business logic associated to how we want to transform and present the data. They should be covered by unit tests.

### 3. Visual Components

- They are sort of what are considered "dumb" components, they do the wiring between the components hoooks and foundational components.

### 4. Foundational components (Design system)

- These are generic, reusable components. They could be smart in some ways but generally they won't be connected to any sources and will provide the aesthetics and visual design constraints of the app. They should be thin and focused on keeping brand guidelines and accessibility on check.

### 5. Pages

- They generally are a combination of Visual components and determine how does routes affect visual components.

## Nice to have

- Server send events to push stream of new logs.
