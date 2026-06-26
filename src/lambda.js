import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COURSES_PATH = join(__dirname, "..", "data", "courses.json");

export async function loadCourses(filePath = COURSES_PATH) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export function normalize(text) {
  return String(text).trim().toLocaleLowerCase();
}

export function findMatchingCourseIds(courses, searchText) {
  const normalizedSearch = normalize(searchText);
  return courses
    .filter(
      (course) =>
        normalize(course.id).includes(normalizedSearch) ||
        normalize(course.name).includes(normalizedSearch)
    )
    .map((course) => course.id);
}

export function buildCourseById(courses) {
  return new Map(courses.map((course) => [course.id, course]));
}

export function buildEdges(courses) {
  return courses.flatMap((course) =>
    (course.prerequisites || []).map((prereq) => ({
      from: prereq.course,
      to: course.id,
      type: prereq.type || "prerequisite",
    }))
  );
}

export function buildNodes(courses, selectedIds) {
  return courses
    .filter((course) => selectedIds.has(course.id))
    .map((course) => ({
      id: course.id,
      name: course.name,
      credits: course.credits,
      cycle: course.cycle,
      type: course.type,
    }));
}

export function buildFullGraph(courses) {
  const selectedIds = new Set(courses.map((course) => course.id));
  return {
    nodes: buildNodes(courses, selectedIds),
    edges: buildEdges(courses),
  };
}

export function buildSearchGraph(courses, searchText) {
  const matchedIds = new Set(findMatchingCourseIds(courses, searchText));
  if (matchedIds.size === 0) {
    return { nodes: [], edges: [] };
  }

  const courseById = buildCourseById(courses);
  const directPrereqs = new Set();
  const directDependents = new Set();

  for (const id of matchedIds) {
    const course = courseById.get(id);
    if (!course) continue;
    for (const prereq of course.prerequisites || []) {
      directPrereqs.add(prereq.course);
    }
  }

  for (const course of courses) {
    for (const prereq of course.prerequisites || []) {
      if (matchedIds.has(prereq.course)) {
        directDependents.add(course.id);
      }
    }
  }

  const selectedIds = new Set([
    ...matchedIds,
    ...directPrereqs,
    ...directDependents,
  ]);

  const edges = buildEdges(courses).filter(
    (edge) => selectedIds.has(edge.from) && selectedIds.has(edge.to)
  );

  return {
    nodes: buildNodes(courses, selectedIds),
    edges,
  };
}

// CORS abierto en TODA respuesta (éxito y error). El sitio se sirve desde S3
// (otro origen), así que el navegador exige estos headers incluso en 500;
// ver CONTRATO-API.md §2 y §9 del frontend.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

export async function handler(event) {
  try {
    const query = event?.queryStringParameters || {};
    const searchText = query.search;
    const coursesPayload = await loadCourses();
    const courses = coursesPayload.courses ?? [];
    const graph = searchText ? buildSearchGraph(courses, searchText) : buildFullGraph(courses);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(graph),
    };
  } catch (error) {
    // Garantiza 500 con CORS presente para que el frontend reciba un error
    // legible en vez de un fallo opaco de CORS (CONTRATO-API.md §9).
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
