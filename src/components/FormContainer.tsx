import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
  | "teacher"
  | "student"
  | "subject"
  | "parent"
  | "class"
  | "lesson"
  | "exam"
  | "assignment"
  | "result"
  | "attendance"
  | "event"
  | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;
  const currentUserId = userId;

  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;

      case "class":
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;

      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;

      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;

      case "exam":
        const examLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true, subjectId: true },
        });
        const examSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { lessons: examLessons, subjects: examSubjects };
        break;

      case "announcement":
        const announcementClasses = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                id: true,
                level: true,
              },
            },
          },
        });
        relatedData = { classes: announcementClasses };
        break;

      case "event":
        const eventClasses = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                id: true,
                level: true,
              },
            },
          },
        });
        relatedData = { classes: eventClasses };
        break;

      case "assignment":
        const assignmentLessons = await prisma.lesson.findMany({
          where: {
            ...(role === "teacher" ? { teacherId: currentUserId! } : {}),
          },
          select: { id: true, name: true, subjectId: true },
        });
        const assignmentSubjects = await prisma.subject.findMany({ select: { id: true, name: true } });
        relatedData = { lessons: assignmentLessons, subjects: assignmentSubjects };
        break;

      default:
        break;
    }
  }

  return (
    <div>
      <FormModal
        table={ table }
        type={ type }
        data={ data }
        id={ id }
        relatedData={ relatedData }
      />
    </div>
  );
};

export default FormContainer;
