"use server";

import { SubjectSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const existingSubject = await prisma.subject.findUnique({
      where: { name: data.name },
    });

    if (existingSubject) {
      return {
        success: false,
        error: true,
        message: "A subject with this name already exists!",
      };
    }

    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Create subject error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to create subject. Please try again.",
    };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        name: data.name,
        NOT: { id: data.id },
      },
    });

    if (existingSubject) {
      return {
        success: false,
        error: true,
        message: "Another subject with this name already exists!",
      };
    }

    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update subject error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to update subject. Please try again.",
    };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const subjectWithLessons = await prisma.subject.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { lessons: true },
        },
      },
    });

    if (!subjectWithLessons) {
      return {
        success: false,
        error: true,
        message: "Subject not found!",
      };
    }

    if (subjectWithLessons._count.lessons > 0) {
      return {
        success: false,
        error: true,
        message:
          "Cannot delete subject that has lessons. Please remove lessons first.",
      };
    }

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Delete subject error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete subject. Please try again.",
    };
  }
};
