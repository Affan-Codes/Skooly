"use server";

import { ClassSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    // Validate class name format based on grade
    const gradeId =
      typeof data.gradeId === "string" ? parseInt(data.gradeId) : data.gradeId;
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });
    if (!grade) {
      return {
        success: false,
        error: true,
        message: "Selected grade not found!",
      };
    }

    // Validate class name format (should be like "2A", "3B", etc.)
    const classNamePattern = new RegExp(`^${grade.level}[A-Z]$`);
    if (!classNamePattern.test(data.name)) {
      return {
        success: false,
        error: true,
        message: `Class name should be in format "${grade.level}A", "${grade.level}B", etc.`,
      };
    }

    // Check if class name already exists
    const existingClass = await prisma.class.findFirst({
      where: { name: data.name },
    });
    if (existingClass) {
      return {
        success: false,
        error: true,
        message: "A class with this name already exists!",
      };
    }

    if (data.supervisorId) {
      const existingSupervisor = await prisma.class.findFirst({
        where: { supervisorId: data.supervisorId },
      });

      if (existingSupervisor) {
        return {
          success: false,
          error: true,
          message: "This teacher is already supervising another class!",
        };
      }
    }

    await prisma.class.create({
      data: {
        name: data.name,
        capacity:
          typeof data.capacity === "string"
            ? parseInt(data.capacity)
            : data.capacity,
        supervisorId: data.supervisorId || null,
        gradeId: gradeId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Create class error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to create class. Please try again.",
    };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    // Check if ID is provided
    if (!data.id) {
      return {
        success: false,
        error: true,
        message: "Class ID is required for update!",
      };
    }

    // Validate class name format based on grade
    const gradeId =
      typeof data.gradeId === "string" ? parseInt(data.gradeId) : data.gradeId;
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });
    if (!grade) {
      return {
        success: false,
        error: true,
        message: "Selected grade not found!",
      };
    }

    // Validate class name format (should be like "2A", "3B", etc.)
    const classNamePattern = new RegExp(`^${grade.level}[A-Z]$`);
    if (!classNamePattern.test(data.name)) {
      return {
        success: false,
        error: true,
        message: `Class name should be in format "${grade.level}A", "${grade.level}B", etc.`,
      };
    }

    // Check if class name already exists (excluding current class)
    const existingClass = await prisma.class.findFirst({
      where: {
        name: data.name,
        id: { not: data.id },
      },
    });
    if (existingClass) {
      return {
        success: false,
        error: true,
        message: "A class with this name already exists!",
      };
    }

    // Check if supervisor is already assigned to another class (excluding current class)
    if (data.supervisorId) {
      const existingSupervisor = await prisma.class.findFirst({
        where: {
          supervisorId: data.supervisorId,
          id: { not: data.id },
        },
      });
      if (existingSupervisor) {
        return {
          success: false,
          error: true,
          message: "This teacher is already supervising another class!",
        };
      }
    }

    await prisma.class.update({
      where: { id: data.id },
      data: {
        name: data.name,
        capacity:
          typeof data.capacity === "string"
            ? parseInt(data.capacity)
            : data.capacity,
        supervisorId: data.supervisorId || null,
        gradeId: gradeId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update class error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to update class. Please try again.",
    };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Check if class has related data (students, lessons, etc.)
    const classWithRelated = await prisma.class.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            students: true,
            lessons: true,
            events: true,
            announcements: true,
          },
        },
      },
    });
    if (!classWithRelated) {
      return {
        success: false,
        error: true,
        message: "Class not found!",
      };
    }

    const { students, lessons, events, announcements } =
      classWithRelated._count;

    if (students > 0 || lessons > 0 || events > 0 || announcements > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete class. It has ${students} student(s), ${lessons} lesson(s), ${events} event(s), and ${announcements} announcement(s). Please remove these first.`,
      };
    }

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Delete class error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete class. Please try again.",
    };
  }
};
