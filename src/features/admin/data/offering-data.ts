export type OfferingStatus = "Draft" | "Published" | "Closed";
export type AcademicPeriodStatus = "Upcoming" | "Active" | "Closed";

export interface CourseOfferingRecord {
  id: number;
  courseTitle: string;
  courseCategory: string;
  periodCode: string;
  periodLabel: string;
  enrollmentWindowLabel: string;
  studyWindowLabel: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startAt: string;
  endAt: string;
  enrolled: number;
  capacity: number;
  price: number;
  discountPrice: number | null;
  status: OfferingStatus;
}

export interface AcademicPeriodRecord {
  id: number;
  code: string;
  name: string;
  startAt: string;
  endAt: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  status: AcademicPeriodStatus;
}

export const COURSE_OFFERING_DATA: CourseOfferingRecord[] = [
  {
    id: 1,
    courseTitle: "Intro Programming",
    courseCategory: "Programming & Tech",
    periodCode: "PRE-U-2026-A",
    periodLabel: "Januari 2026 - April 2026",
    enrollmentWindowLabel: "01 Mei 2026 - 15 Mei 2026",
    studyWindowLabel: "20 Mei 2026 - 20 Ags 2026",
    enrollmentOpenAt: "01/05/2026",
    enrollmentCloseAt: "15/05/2026",
    startAt: "20/05/2026",
    endAt: "20/08/2026",
    enrolled: 48,
    capacity: 60,
    price: 850000,
    discountPrice: 750000,
    status: "Published",
  },
  {
    id: 2,
    courseTitle: "Data Structures",
    courseCategory: "Programming & Tech",
    periodCode: "PRE-U-2026-A",
    periodLabel: "Januari 2026 - April 2026",
    enrollmentWindowLabel: "01 Mei 2026 - 15 Mei 2026",
    studyWindowLabel: "20 Mei 2026 - 20 Ags 2026",
    enrollmentOpenAt: "01/05/2026",
    enrollmentCloseAt: "15/05/2026",
    startAt: "20/05/2026",
    endAt: "20/08/2026",
    enrolled: 32,
    capacity: 50,
    price: 950000,
    discountPrice: 850000,
    status: "Published",
  },
  {
    id: 3,
    courseTitle: "Fundamentals of Mathematics",
    courseCategory: "Mathematics",
    periodCode: "PRE-U-2026-A",
    periodLabel: "Januari 2026 - April 2026",
    enrollmentWindowLabel: "01 Mei 2026 - 15 Mei 2026",
    studyWindowLabel: "20 Mei 2026 - 20 Ags 2026",
    enrollmentOpenAt: "01/05/2026",
    enrollmentCloseAt: "15/05/2026",
    startAt: "20/05/2026",
    endAt: "20/08/2026",
    enrolled: 41,
    capacity: 80,
    price: 700000,
    discountPrice: 600000,
    status: "Draft",
  },
  {
    id: 4,
    courseTitle: "English for Academic Purposes",
    courseCategory: "English",
    periodCode: "PRE-U-2026-B",
    periodLabel: "Mei 2026 - Agustus 2026",
    enrollmentWindowLabel: "01 Agu 2026 - 15 Agu 2026",
    studyWindowLabel: "20 Agu 2026 - 20 Des 2026",
    enrollmentOpenAt: "01/08/2026",
    enrollmentCloseAt: "15/08/2026",
    startAt: "20/08/2026",
    endAt: "20/12/2026",
    enrolled: 0,
    capacity: 40,
    price: 600000,
    discountPrice: 500000,
    status: "Draft",
  },
];

export const ACADEMIC_PERIOD_DATA: AcademicPeriodRecord[] = [
  {
    id: 1,
    code: "PRE-U-2025-A",
    name: "Mei 2025 - Agustus 2025",
    startAt: "01 Mei 2025",
    endAt: "20 Ags 2025",
    enrollmentOpenAt: "01 Apr 2025",
    enrollmentCloseAt: "20 Apr 2025",
    status: "Closed",
  },
  {
    id: 2,
    code: "PRE-U-2025-B",
    name: "September 2025 - Desember 2025",
    startAt: "01 Sep 2025",
    endAt: "15 Des 2025",
    enrollmentOpenAt: "15 Agu 2025",
    enrollmentCloseAt: "31 Agu 2025",
    status: "Closed",
  },
  {
    id: 3,
    code: "PRE-U-2026-A",
    name: "Januari 2026 - April 2026",
    startAt: "05 Jan 2026",
    endAt: "30 Apr 2026",
    enrollmentOpenAt: "15 Des 2025",
    enrollmentCloseAt: "31 Des 2025",
    status: "Active",
  },
  {
    id: 4,
    code: "PRE-U-2026-B",
    name: "Mei 2026 - Agustus 2026",
    startAt: "01 Mei 2026",
    endAt: "20 Ags 2026",
    enrollmentOpenAt: "01 Apr 2026",
    enrollmentCloseAt: "15 Apr 2026",
    status: "Upcoming",
  },
  {
    id: 5,
    code: "PRE-U-2026-C",
    name: "September 2026 - Desember 2026",
    startAt: "01 Sep 2026",
    endAt: "15 Des 2026",
    enrollmentOpenAt: "01 Agu 2026",
    enrollmentCloseAt: "15 Agu 2026",
    status: "Upcoming",
  },
];

export function getCourseOfferingById(id: number): CourseOfferingRecord | undefined {
  return COURSE_OFFERING_DATA.find((item) => item.id === id);
}

export function getAcademicPeriodById(id: number): AcademicPeriodRecord | undefined {
  return ACADEMIC_PERIOD_DATA.find((item) => item.id === id);
}

export function getOfferingsByPeriodCode(periodCode: string): CourseOfferingRecord[] {
  return COURSE_OFFERING_DATA.filter((item) => item.periodCode === periodCode);
}
