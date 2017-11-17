import { init } from "./harness";

var graphql;

beforeAll(async () => {
  graphql = await init();
});

test("queries node field", async () => {
  const source = `query TestQuery($david: ID!) {
    person(id: $david) {
      name
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("queries node fields", async () => {
  const source = `query TestQuery($david: ID!) {
    person(id: $david) {
      name
      employed
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("returns null for node", async () => {
  const source = `query {
    person(id: "0xFFFFFFFFFF") {
      name
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("returns null for non-existing edge", async () => {
  const source = `query TestQuery($linda: ID!) {
    person(id: $linda) {
      partner {
        name
      }
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("returns empty array for non-existing edges", async () => {
  const source = `query TestQuery($linda: ID!) {
    person(id: $linda) {
      parents {
        name
      }
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("queries type name", async () => {
  const source = `query TestQuery($david: ID!) {
    person(id: $david) {
      __typename
    }
  }`;
  const result = await graphql(source);
  expect(result.data.person.__typename).toEqual("Person");
});

test("queries aliased field", async () => {
  const source = `query TestQuery($david: ID!) {
    person(id: $david) {
      test: name
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("queries nested field", async () => {
  const source = `query TestQuery($david: ID!) {
    person(id: $david) {
      name
      partner {
        name
      }
    }
  }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("order edges by string ascending", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time
        }
      ) {
        name
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("order edges by string descending", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_desc,
        filter: {
          time_eq: $time
        }
      ) {
        name
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by string with all terms", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_allofterms: "David Peek"
        }
      ) {
        name
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by string with any of terms", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_anyofterms: "David Olivia"
        }
      ) {
        name
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by string equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          name_eq: "Olivia Peek"
        }
      ) {
        name
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by boolean equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: name_asc,
        filter: {
          time_eq: $time,
          employed_eq: true
        }
      ) {
        name
        employed
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by int equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_eq: 37
        }
      ) {
        name
        age
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});
test("filters by int less than", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_lt: 37
        }
      ) {
        name
        age
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by int less than or equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_le: 37
        }
      ) {
        name
        age
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by int greater than", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_gt: 37
        }
      ) {
        name
        age
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by int greater than or equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: age_asc,
        filter: {
          time_eq: $time,
          age_ge: 37
        }
      ) {
        name
        age
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by float equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_eq: 1.70
        }
      ) {
        name
        height
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by float less than", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_lt: 1.70
        }
      ) {
        name
        height
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by float less than or equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_le: 1.70
        }
      ) {
        name
        height
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by float greater than", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_gt: 1.70
        }
      ) {
        name
        height
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});

test("filters by float greater than or equal to", async () => {
  const source = `query TestQuery($time: Int) {
      people(
        order: height_asc,
        filter: {
          time_eq: $time,
          height_ge: 1.70
        }
      ) {
        name
        height
      }
    }`;
  const result = await graphql(source);
  expect(result).toMatchSnapshot();
});
