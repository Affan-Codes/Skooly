import prisma from "./prisma";

const currentWorkWeek = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();

  const startOfWeek = new Date(today);
  if (dayOfWeek === 0) {
    startOfWeek.setDate(today.getDate() + 1);
  }
  if (dayOfWeek === 6) {
    startOfWeek.setDate(today.getDate() + 2);
  } else {
    startOfWeek.setDate(today.getDate() - (dayOfWeek - 1));
  }
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
};

export const adjustScheduleToCurrentWeek = (
  lessons: { title: string; start: Date; end: Date }[]
): { title: string; start: Date; end: Date }[] => {
  const startOfWeek = currentWorkWeek();

  return lessons.map((lesson) => {
    const lessonDayOfWeek = lesson.start.getDay();

    const daysFromMonday = lessonDayOfWeek === 0 ? 6 : lessonDayOfWeek - 1;

    const adjustedStartDate = new Date(startOfWeek);
    adjustedStartDate.setDate(startOfWeek.getDate() + daysFromMonday);
    adjustedStartDate.setHours(
      lesson.start.getHours(),
      lesson.start.getMinutes(),
      lesson.start.getSeconds()
    );

    const adjustedEndDate = new Date(adjustedStartDate);
    adjustedEndDate.setHours(
      lesson.end.getHours(),
      lesson.end.getMinutes(),
      lesson.end.getSeconds()
    );

    return {
      title: lesson.title,
      start: adjustedStartDate,
      end: adjustedEndDate,
    };
  });
};

export function formatDateTimeForInput(
  dateTime: Date | string | undefined
): string {
  if (!dateTime) return "";

  let dateString: string;

  // Handle both Date objects and strings from database
  if (dateTime instanceof Date) {
    dateString = dateTime.toISOString();
  } else {
    dateString = dateTime.toString();
  }

  // If database returns "2025-09-17 05:00:00" format (space instead of T)
  // Convert it to proper ISO format and treat as UTC
  if (dateString.includes(" ") && !dateString.includes("T")) {
    dateString = dateString.replace(" ", "T") + "Z";
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  // Get local time components (JavaScript auto-converts UTC to local)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const Capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export async function getAnnouncementsCount(user: any) {
  if (!user) return 0;

  const role = user.publicMetadata?.role as string;

  switch (role) {
    case "admin":
      return await prisma.announcement.count();

    case "teacher":
      return await prisma.announcement.count({
        where: {
          class: {
            supervisorId: user.id, // teacher supervises the class
          },
        },
      });

    case "student":
      return await prisma.announcement.count({
        where: {
          classId: user.classId, // student belongs to a class
        },
      });

    case "parent":
      return await prisma.announcement.count({
        where: {
          class: {
            students: {
              some: { parentId: user.id }, // parent linked to student(s)
            },
          },
        },
      });

    default:
      return 0;
  }
}

export type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};

export type PageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};
