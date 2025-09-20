"use server";

import { LessonSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState, Day, DayEnum } from "@/lib/utils";

// Helper function to get day from date
const getDayFromDate = (date: Date): Day => {
  const dayOfWeek = date.getDay();
  const dayMapping = [
    DayEnum.MONDAY,
    DayEnum.MONDAY,
    DayEnum.TUESDAY,
    DayEnum.WEDNESDAY,
    DayEnum.THURSDAY,
    DayEnum.FRIDAY,
    DayEnum.MONDAY,
  ];
  return dayMapping[dayOfWeek];
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const dayFromDate = getDayFromDate(startTime);

    // Validate school hours (8 AM to 5 PM)
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();

    if (startHour < 8 || startHour >= 17) {
      return {
        success: false,
        error: true,
        message: "Start time must be between 8:00 AM and 5:00 PM!",
      };
    }

    if (endHour > 17 || (endHour === 17 && endMinutes > 0)) {
      return {
        success: false,
        error: true,
        message: "End time cannot be after 5:00 PM!",
      };
    }

    // Validate same day
    if (startTime.toDateString() !== endTime.toDateString()) {
      return {
        success: false,
        error: true,
        message: "Start and end time must be on the same day!",
      };
    }

    // Validate end time after start time
    if (endTime <= startTime) {
      return {
        success: false,
        error: true,
        message: "End time must be after start time!",
      };
    }

    // Check if teacher is assigned to the subject
    const subjectTeacher = await prisma.subject.findFirst({
      where: {
        id: parseInt(data.subjectId),
        teachers: {
          some: {
            id: data.teacherId,
          },
        },
      },
    });
    if (!subjectTeacher) {
      return {
        success: false,
        error: true,
        message: "Selected teacher is not assigned to this subject!",
      };
    }

    // Check for time conflicts with the same teacher
    const conflictingLesson = await prisma.lesson.findFirst({
      where: {
        teacherId: data.teacherId,
        day: dayFromDate,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(data.startTime) } },
              { endTime: { lte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });
    if (conflictingLesson) {
      return {
        success: false,
        error: true,
        message: "Teacher has a conflicting lesson at this time!",
      };
    }

    // Check for time conflicts with the same class
    const conflictingClassLesson = await prisma.lesson.findFirst({
      where: {
        classId: parseInt(data.classId),
        day: dayFromDate,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(data.startTime) } },
              { endTime: { lte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });
    if (conflictingClassLesson) {
      return {
        success: false,
        error: true,
        message: "Class has a conflicting lesson at this time!",
      };
    }

    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: parseInt(data.subjectId),
        classId: parseInt(data.classId),
        teacherId: data.teacherId,
      },
    });
    return { success: true, error: false };
  } catch (err) {
    console.error("Create lesson error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to create lesson. Please try again.",
    };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const dayFromDate = getDayFromDate(startTime);

    // Validate school hours (8 AM to 5 PM)
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();

    if (startHour < 8 || startHour >= 17) {
      return {
        success: false,
        error: true,
        message: "Start time must be between 8:00 AM and 5:00 PM!",
      };
    }

    if (endHour > 17 || (endHour === 17 && endMinutes > 0)) {
      return {
        success: false,
        error: true,
        message: "End time cannot be after 5:00 PM!",
      };
    }

    // Validate same day
    if (startTime.toDateString() !== endTime.toDateString()) {
      return {
        success: false,
        error: true,
        message: "Start and end time must be on the same day!",
      };
    }

    // Validate end time after start time
    if (endTime <= startTime) {
      return {
        success: false,
        error: true,
        message: "End time must be after start time!",
      };
    }

    // Check if teacher is assigned to the subject
    const subjectTeacher = await prisma.subject.findFirst({
      where: {
        id: parseInt(data.subjectId),
        teachers: {
          some: {
            id: data.teacherId,
          },
        },
      },
    });

    if (!subjectTeacher) {
      return {
        success: false,
        error: true,
        message: "Selected teacher is not assigned to this subject!",
      };
    }

    // Check for time conflicts with the same teacher (excluding current lesson)
    const conflictingLesson = await prisma.lesson.findFirst({
      where: {
        id: { not: data.id ? parseInt(data.id) : undefined },
        teacherId: data.teacherId,
        day: dayFromDate,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(data.startTime) } },
              { endTime: { lte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });
    if (conflictingLesson) {
      return {
        success: false,
        error: true,
        message: "Teacher has a conflicting lesson at this time!",
      };
    }

    // Check for time conflicts with the same class (excluding current lesson)
    const conflictingClassLesson = await prisma.lesson.findFirst({
      where: {
        id: { not: data.id ? parseInt(data.id) : undefined },
        classId: parseInt(data.classId),
        day: dayFromDate,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(data.startTime) } },
              { endTime: { gt: new Date(data.startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(data.endTime) } },
              { endTime: { gte: new Date(data.endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(data.startTime) } },
              { endTime: { lte: new Date(data.endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingClassLesson) {
      return {
        success: false,
        error: true,
        message: "Class has a conflicting lesson at this time!",
      };
    }

    await prisma.lesson.update({
      where: {
        id: parseInt(data.id!),
      },
      data: {
        name: data.name,
        day: data.day,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        subjectId: parseInt(data.subjectId),
        classId: parseInt(data.classId),
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update lesson error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to update lesson. Please try again.",
    };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Check if lesson has related data
    const lessonWithRelated = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            exams: true,
            assignments: true,
            attendances: true,
          },
        },
      },
    });

    if (!lessonWithRelated) {
      return {
        success: false,
        error: true,
        message: "Lesson not found!",
      };
    }

    const { exams, assignments, attendances } = lessonWithRelated._count;

    if (exams > 0 || assignments > 0 || attendances > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete lesson. It has ${exams} exam(s), ${assignments} assignment(s), and ${attendances} attendance record(s). Please remove these first.`,
      };
    }

    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Delete lesson error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete lesson. Please try again.",
    };
  }
};
