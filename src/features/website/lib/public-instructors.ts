import type { StoreCourse } from "@/types/store";

export interface PublicInstructorProfile {
  id: number | null;
  slug: string;
  name: string;
  description: string;
  initials: string;
  courseCount: number;
  categories: string[];
  totalReviews: number;
  averageRating: number | null;
  featuredCourse: StoreCourse;
  courses: StoreCourse[];
}

function normalizeInstructorName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

function slugifySegment(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "instructor";
}

function buildInstructorKey(course: StoreCourse): string | null {
  const name = normalizeInstructorName(course.instructor_name);

  if (!name) {
    return null;
  }

  if (typeof course.instructor_id === "number") {
    return `id:${course.instructor_id}`;
  }

  return `name:${name.toLowerCase()}`;
}

function sortCourses(courses: StoreCourse[]): StoreCourse[] {
  return [...courses].sort((left, right) => {
    const reviewDiff = Number(right.reviews_count ?? 0) - Number(left.reviews_count ?? 0);

    if (reviewDiff !== 0) {
      return reviewDiff;
    }

    const ratingDiff = Number(right.reviews_avg_rating ?? 0) - Number(left.reviews_avg_rating ?? 0);

    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return left.title.localeCompare(right.title, "id-ID");
  });
}

function computeAverageRating(courses: StoreCourse[]): number | null {
  let totalReviews = 0;
  let totalScore = 0;
  let fallbackCount = 0;

  courses.forEach((course) => {
    const reviewCount = Number(course.reviews_count ?? 0);
    const averageRating = Number(course.reviews_avg_rating ?? 0);

    if (reviewCount > 0 && averageRating > 0) {
      totalReviews += reviewCount;
      totalScore += averageRating * reviewCount;
      return;
    }

    if (averageRating > 0) {
      totalScore += averageRating;
      fallbackCount += 1;
    }
  });

  if (totalReviews > 0) {
    return totalScore / totalReviews;
  }

  if (fallbackCount > 0) {
    return totalScore / fallbackCount;
  }

  return null;
}

function buildInstructorDescription(name: string, courses: StoreCourse[], categories: string[]): string {
  const bio = courses
    .map((course) => course.instructor_bio?.trim())
    .find((value): value is string => Boolean(value));

  if (bio) {
    return bio;
  }

  if (categories.length > 0) {
    const visibleCategories = categories.slice(0, 3).join(", ");
    const suffix = categories.length > 3 ? ", dan kategori lainnya" : "";

    return `${name} mengajar ${courses.length} course pada kategori ${visibleCategories}${suffix}.`;
  }

  return `${name} mengajar ${courses.length} course di platform ini.`;
}

export function getPublicInstructorInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "IN";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function buildPublicInstructorSlug(id: number | null, name: string): string {
  const slug = slugifySegment(name);
  return typeof id === "number" ? `${id}-${slug}` : `name-${slug}`;
}

export function getCourseInstructorHref(course: StoreCourse): string | null {
  const name = normalizeInstructorName(course.instructor_name);

  if (!name) {
    return null;
  }

  return `/instructors/${buildPublicInstructorSlug(course.instructor_id, name)}`;
}

export function buildPublicInstructorProfiles(courses: StoreCourse[]): PublicInstructorProfile[] {
  const groups = new Map<string, StoreCourse[]>();

  courses.forEach((course) => {
    const key = buildInstructorKey(course);

    if (!key) {
      return;
    }

    const currentCourses = groups.get(key) ?? [];
    currentCourses.push(course);
    groups.set(key, currentCourses);
  });

  return Array.from(groups.values())
    .map((group) => {
      const sortedCourses = sortCourses(group);
      const featuredCourse = sortedCourses[0]!;
      const name = normalizeInstructorName(featuredCourse.instructor_name) ?? "Instructor";
      const categories = Array.from(
        new Set(
          sortedCourses
            .map((course) => course.category_name?.trim())
            .filter((category): category is string => Boolean(category)),
        ),
      );

      return {
        id: featuredCourse.instructor_id,
        slug: buildPublicInstructorSlug(featuredCourse.instructor_id, name),
        name,
        description: buildInstructorDescription(name, sortedCourses, categories),
        initials: getPublicInstructorInitials(name),
        courseCount: sortedCourses.length,
        categories,
        totalReviews: sortedCourses.reduce((total, course) => total + Number(course.reviews_count ?? 0), 0),
        averageRating: computeAverageRating(sortedCourses),
        featuredCourse,
        courses: sortedCourses,
      };
    })
    .sort((left, right) => {
      if (right.courseCount !== left.courseCount) {
        return right.courseCount - left.courseCount;
      }

      if (right.totalReviews !== left.totalReviews) {
        return right.totalReviews - left.totalReviews;
      }

      return left.name.localeCompare(right.name, "id-ID");
    });
}

export function findPublicInstructorProfile(
  courses: StoreCourse[],
  slug: string,
): PublicInstructorProfile | null {
  return buildPublicInstructorProfiles(courses).find((instructor) => instructor.slug === slug) ?? null;
}
