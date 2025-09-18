"use server";

import { ResultSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    // Validate that either examId or assignmentId is provided, but not both
    const hasExam = data.examId && data.examId !== "";
    const hasAssignment = data.assignmentId && data.assignmentId !== "";

    const examId =
      typeof data.examId === "string" ? parseInt(data.examId) : data.examId!;
    const assignmentId =
      typeof data.assignmentId === "string"
        ? parseInt(data.assignmentId)
        : data.assignmentId!;

    if (!hasExam && !hasAssignment) {
      return {
        success: false,
        error: true,
        message: "Please select either an exam or an assignment!",
      };
    }

    if (hasExam && hasAssignment) {
      return {
        success: false,
        error: true,
        message: "Please select either an exam OR an assignment, not both!",
      };
    }

    // Validate score range
    const score =
      typeof data.score === "string" ? parseInt(data.score) : data.score;
    if (score < 0 || score > 100) {
      return {
        success: false,
        error: true,
        message: "Score must be between 0 and 100!",
      };
    }

    // Check if student is enrolled in the class of the selected exam/assignment
    let classId: number;
    if (hasExam) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: { lesson: { select: { classId: true } } },
      });

      if (!exam) {
        return {
          success: false,
          error: true,
          message: "Selected exam not found!",
        };
      }
      classId = exam.lesson.classId;
    } else {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { lesson: { select: { classId: true } } },
      });

      if (!assignment) {
        return {
          success: false,
          error: true,
          message: "Selected assignment not found!",
        };
      }
      classId = assignment.lesson.classId;
    }

    // Verify student is in the correct class
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { classId: true, name: true, surname: true },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        message: "Selected student not found!",
      };
    }

    if (student.classId !== classId) {
      return {
        success: false,
        error: true,
        message: `Student ${student.name} ${student.surname} is not enrolled in the required class!`,
      };
    }

    // Check if result already exists for this student and exam/assignment
    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: data.studentId,
        ...(hasExam ? { examId: examId } : { assignmentId: assignmentId }),
      },
    });

    if (existingResult) {
      return {
        success: false,
        error: true,
        message: "A result already exists for this student and assessment!",
      };
    }

    await prisma.result.create({
      data: {
        score: score,
        studentId: data.studentId,
        examId: hasExam ? examId : null,
        assignmentId: hasAssignment ? assignmentId : null,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Create result error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to create result. Please try again.",
    };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    const examId =
      typeof data.examId === "string" ? parseInt(data.examId) : data.examId!;
    const assignmentId =
      typeof data.assignmentId === "string"
        ? parseInt(data.assignmentId)
        : data.assignmentId!;

    // Check if ID is provided
    if (!data.id) {
      return {
        success: false,
        error: true,
        message: "Result ID is required for update!",
      };
    }

    // Check if result exists
    const existingResult = await prisma.result.findUnique({
      where: { id: data.id },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "Result not found!",
      };
    }

    // Validate that either examId or assignmentId is provided, but not both
    const hasExam = data.examId && data.examId !== "";
    const hasAssignment = data.assignmentId && data.assignmentId !== "";

    if (!hasExam && !hasAssignment) {
      return {
        success: false,
        error: true,
        message: "Please select either an exam or an assignment!",
      };
    }

    if (hasExam && hasAssignment) {
      return {
        success: false,
        error: true,
        message: "Please select either an exam OR an assignment, not both!",
      };
    }

    // Validate score range
    const score =
      typeof data.score === "string" ? parseInt(data.score) : data.score;
    if (score < 0 || score > 100) {
      return {
        success: false,
        error: true,
        message: "Score must be between 0 and 100!",
      };
    }

    // Check if student is enrolled in the class of the selected exam/assignment
    let classId: number;
    if (hasExam) {
      const exam = await prisma.exam.findUnique({
        where: { id: examId },
        include: { lesson: { select: { classId: true } } },
      });

      if (!exam) {
        return {
          success: false,
          error: true,
          message: "Selected exam not found!",
        };
      }
      classId = exam.lesson.classId;
    } else {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { lesson: { select: { classId: true } } },
      });
      if (!assignment) {
        return {
          success: false,
          error: true,
          message: "Selected assignment not found!",
        };
      }
      classId = assignment.lesson.classId;
    }

    // Verify student is in the correct class
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { classId: true, name: true, surname: true },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        message: "Selected student not found!",
      };
    }

    if (student.classId !== classId) {
      return {
        success: false,
        error: true,
        message: `Student ${student.name} ${student.surname} is not enrolled in the required class!`,
      };
    }

    // Check if another result exists for this student and exam/assignment (excluding current result)
    const duplicateResult = await prisma.result.findFirst({
      where: {
        id: { not: data.id },
        studentId: data.studentId,
        ...(hasExam ? { examId: examId } : { assignmentId: assignmentId }),
      },
    });

    if (duplicateResult) {
      return {
        success: false,
        error: true,
        message:
          "Another result already exists for this student and assessment!",
      };
    }

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: score,
        studentId: data.studentId,
        examId: hasExam ? examId : null,
        assignmentId: hasAssignment ? assignmentId : null,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Update result error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to update result. Please try again.",
    };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "Result not found!",
      };
    }

    await prisma.result.delete({
      where: { id: parseInt(id) },
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("Delete result error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete result. Please try again.",
    };
  }
};
