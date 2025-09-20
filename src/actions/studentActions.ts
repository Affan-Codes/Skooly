"use server";

import { StudentSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs/server";

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  let clerkUserId: string | null = null;

  try {
    const gradeId = parseInt(data.gradeId);
    const classId = parseInt(data.classId);
    const birthday = new Date(data.birthday);

    // Validate conversions
    if (isNaN(gradeId) || isNaN(classId)) {
      return {
        success: false,
        error: true,
        message: "Invalid grade or class selection!",
      };
    }
    if (isNaN(birthday.getTime())) {
      return {
        success: false,
        error: true,
        message: "Invalid birthday format!",
      };
    }

    // Check if student already exists in database
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });
    if (existingStudent) {
      if (existingStudent.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (data.email && existingStudent.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
        };
      }
      if (data.phone && existingStudent.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
    }

    // Check if parent exists
    const parent = await prisma.parent.findUnique({
      where: { id: data.parentId },
      select: { id: true, name: true, surname: true },
    });
    if (!parent) {
      return {
        success: false,
        error: true,
        message: "Selected parent not found!",
      };
    }

    // Check class capacity
    const classItem = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { students: true } },
      },
    });
    if (!classItem) {
      return {
        success: false,
        error: true,
        message: "Selected class not found!",
      };
    }

    if (classItem.capacity <= classItem._count.students) {
      return {
        success: false,
        error: true,
        message: `Class ${classItem.name} is at full capacity (${classItem.capacity}/${classItem.capacity})!`,
      };
    }

    // Verify grade and class match
    if (classItem.gradeId !== gradeId) {
      return {
        success: false,
        error: true,
        message: "Selected class does not belong to the selected grade!",
      };
    }

    // Create user in Clerk
    const clerk = await clerkClient();
    const clerkOperation = clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });

    const user = (await Promise.race([
      clerkOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk operation timeout")), 20000)
      ),
    ])) as any;

    clerkUserId = user.id;

    // Create student in database
    const dbOperation = prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: birthday,
        gradeId: gradeId,
        classId: classId,
        parentId: data.parentId,
      },
    });

    await Promise.race([
      dbOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database operation timeout")), 15000)
      ),
    ]);

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create student error:", err);

    // Rollback Clerk user if DB operation failed
    if (clerkUserId) {
      try {
        console.log("Attempting to rollback Clerk user:", clerkUserId);
        const clerk = await clerkClient();
        await Promise.race([
          clerk.users.deleteUser(clerkUserId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Cleanup timeout")), 10000)
          ),
        ]);
        console.log("Successfully rolled back Clerk user:", clerkUserId);
      } catch (cleanupErr) {
        console.error("Failed to cleanup Clerk user:", cleanupErr);
        console.error(
          "MANUAL CLEANUP REQUIRED - Orphaned Clerk user:",
          clerkUserId
        );
      }
    }

    // Return specific error messages
    if (err.errors?.[0]?.code === "form_password_pwned") {
      return {
        success: false,
        error: true,
        message:
          "Password has been found in a data breach. Please use a different, stronger password.",
      };
    }

    if (err.errors?.[0]?.code === "form_identifier_exists") {
      return {
        success: false,
        error: true,
        message: "Username already exists. Please choose a different username.",
      };
    }

    return {
      success: false,
      error: true,
      message:
        err.errors?.[0]?.message ||
        "Failed to create student. Please try again.",
    };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Student ID is required for update!",
    };
  }

  try {
    // Convert string fields to appropriate types
    const gradeId = parseInt(data.gradeId);
    const classId = parseInt(data.classId);
    const birthday = new Date(data.birthday);

    // Validate conversions
    if (isNaN(gradeId) || isNaN(classId)) {
      return {
        success: false,
        error: true,
        message: "Invalid grade or class selection!",
      };
    }
    if (isNaN(birthday.getTime())) {
      return {
        success: false,
        error: true,
        message: "Invalid birthday format!",
      };
    }

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: data.id },
      select: { classId: true, name: true, surname: true },
    });
    if (!existingStudent) {
      return {
        success: false,
        error: true,
        message: "Student not found!",
      };
    }

    // Check for conflicts with other students
    const conflictingStudent = await prisma.student.findFirst({
      where: {
        NOT: { id: data.id },
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });
    if (conflictingStudent) {
      if (conflictingStudent.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (data.email && conflictingStudent.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
        };
      }
      if (data.phone && conflictingStudent.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
    }

    // Check if parent exists
    const parent = await prisma.parent.findUnique({
      where: { id: data.parentId },
      select: { id: true, name: true, surname: true },
    });
    if (!parent) {
      return {
        success: false,
        error: true,
        message: "Selected parent not found!",
      };
    }

    // Check class capacity only if changing classes
    if (existingStudent.classId !== classId) {
      const newClass = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          _count: { select: { students: true } },
        },
      });
      if (!newClass) {
        return {
          success: false,
          error: true,
          message: "Selected class not found!",
        };
      }
      if (newClass.capacity <= newClass._count.students) {
        return {
          success: false,
          error: true,
          message: `Class ${newClass.name} is at full capacity (${newClass.capacity}/${newClass.capacity})!`,
        };
      }

      // Verify grade and class match
      if (newClass.gradeId !== gradeId) {
        return {
          success: false,
          error: true,
          message: "Selected class does not belong to the selected grade!",
        };
      }
    }

    // Update user in Clerk
    const clerk = await clerkClient();
    const updateData: any = {
      username: data.username,
      firstName: data.name,
      lastName: data.surname,
    };

    // Only update password if provided
    if (data.password && data.password.trim() !== "") {
      updateData.password = data.password;
    }

    const clerkOperation = clerk.users.updateUser(data.id, updateData);

    await Promise.race([
      clerkOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk update timeout")), 20000)
      ),
    ]);

    // Update student in database
    const dbOperation = prisma.student.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: birthday,
        gradeId: gradeId,
        classId: classId,
        parentId: data.parentId,
      },
    });

    await Promise.race([
      dbOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database update timeout")), 15000)
      ),
    ]);

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Update student error:", err);

    // Return specific error messages
    if (err.errors?.[0]?.code === "form_password_pwned") {
      return {
        success: false,
        error: true,
        message:
          "Password has been found in a data breach. Please use a different, stronger password.",
      };
    }

    if (err.errors?.[0]?.code === "form_identifier_exists") {
      return {
        success: false,
        error: true,
        message: "Username already exists. Please choose a different username.",
      };
    }

    return {
      success: false,
      error: true,
      message:
        err.errors?.[0]?.message ||
        "Failed to update student. Please try again.",
    };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Check if student has related data
    const queryOperation = prisma.student.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            results: true,
            attendances: true,
          },
        },
      },
    });

    const studentWithRelated = (await Promise.race([
      queryOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 15000)
      ),
    ])) as any;

    if (!studentWithRelated) {
      return {
        success: false,
        error: true,
        message: "Student not found!",
      };
    }

    const { results, attendances } = studentWithRelated._count;

    if (results > 0 || attendances > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete student. They have ${results} result(s) and ${attendances} attendance record(s). Please remove these first.`,
      };
    }

    // Delete from Clerk first
    const clerk = await clerkClient();
    const clerkDeleteOperation = clerk.users.deleteUser(id);

    await Promise.race([
      clerkDeleteOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk deletion timeout")), 20000)
      ),
    ]);
    // Then delete from database
    const dbDeleteOperation = prisma.student.delete({
      where: { id },
    });

    await Promise.race([
      dbDeleteOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database deletion timeout")), 15000)
      ),
    ]);

    return { success: true, error: false };
  } catch (err) {
    console.error("Delete student error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete student. Please try again.",
    };
  }
};
