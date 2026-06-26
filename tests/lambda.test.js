import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildFullGraph,
  buildSearchGraph,
  findMatchingCourseIds,
  buildEdges,
  buildNodes,
  handler,
} from "../src/lambda.js";

const sampleCourses = [
  {
    id: "INF100",
    name: "Introducción a la Programación",
    credits: 4,
    cycle: 1,
    type: "obligatorio",
    prerequisites: [],
  },
  {
    id: "INF200",
    name: "Estructuras de Datos",
    credits: 4,
    cycle: 2,
    type: "obligatorio",
    prerequisites: [{ course: "INF100", type: "aprobado" }],
  },
  {
    id: "INF300",
    name: "Algoritmos",
    credits: 4,
    cycle: 3,
    type: "obligatorio",
    prerequisites: [{ course: "INF200", type: "aprobado" }],
  },
];

test("findMatchingCourseIds finds by id and name case-insensitive", () => {
  const ids = findMatchingCourseIds(sampleCourses, "inf200");
  assert.deepEqual(ids, ["INF200"]);
  const idsByName = findMatchingCourseIds(sampleCourses, "algoritmos");
  assert.deepEqual(idsByName, ["INF300"]);
});

test("buildFullGraph includes all nodes and edges", () => {
  const graph = buildFullGraph(sampleCourses);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 2);
  assert.deepEqual(graph.edges[0], { from: "INF100", to: "INF200", type: "aprobado" });
});

test("buildSearchGraph returns matched course plus prereqs and dependents", () => {
  const graph = buildSearchGraph(sampleCourses, "inf200");
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  assert.ok(nodeIds.has("INF200"));
  assert.ok(nodeIds.has("INF100"));
  assert.ok(nodeIds.has("INF300"));
  assert.equal(graph.edges.length, 2);
});

test("buildSearchGraph returns empty graph when no match", () => {
  const graph = buildSearchGraph(sampleCourses, "no-existe");
  assert.deepEqual(graph, { nodes: [], edges: [] });
});

test("buildNodes filters selected course ids", () => {
  const nodes = buildNodes(sampleCourses, new Set(["INF100", "INF300"]));
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].id, "INF100");
});

test("buildEdges includes prerequisites relationships", () => {
  const edges = buildEdges(sampleCourses);
  assert.equal(edges.length, 2);
  assert.deepEqual(edges[1], { from: "INF200", to: "INF300", type: "aprobado" });
});

test("handler returns 200 with CORS headers and a {nodes,edges} body", async () => {
  const response = await handler({ queryStringParameters: {} });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(response.headers["Content-Type"], "application/json");
  const body = JSON.parse(response.body);
  assert.ok(Array.isArray(body.nodes));
  assert.ok(Array.isArray(body.edges));
});

test("handler returns 500 WITH CORS headers when loadCourses fails (CONTRATO §9)", async () => {
  // event sin queryStringParameters fuerza el camino normal; simulamos un fallo
  // de runtime pasando un evento que rompe el acceso a queryStringParameters.
  const brokenEvent = Object.defineProperty({}, "queryStringParameters", {
    get() {
      throw new Error("boom");
    },
  });
  const response = await handler(brokenEvent);
  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "*");
  const body = JSON.parse(response.body);
  assert.equal(typeof body.error, "string");
});
