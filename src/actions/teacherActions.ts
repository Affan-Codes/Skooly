"use server";

import { TeacherSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs/server";

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  let clerkUserId: string | null = null;

  try {
    // Check if teacher already exists in database
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (existingTeacher) {
      if (existingTeacher.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (data.email && existingTeacher.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
        };
      }
      if (data.phone && existingTeacher.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
    }

    const clerk = await clerkClient();
    const clerkOperation = clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "teacher" },
    });

    const user = (await Promise.race([
      clerkOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk operation timeout")), 20000)
      ),
    ])) as any;

    clerkUserId = user.id;

    const dbOperation = prisma.teacher.create({
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
        birthday: data.birthday,
        subjects: {
          connect:
            data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })) || [],
        },
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
    console.error("Full error:", err);
    console.error("Error details:", err.errors);

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
      message: err.errors?.[0]?.message || "Failed to create teacher",
    };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id: data.id },
      select: { id: true, username: true, email: true, phone: true },
    });

    if (!existingTeacher) {
      return {
        success: false,
        error: true,
        message: "Teacher not found!",
      };
    }

    // Check for conflicts with other teachers
    const conflictingTeacher = await prisma.teacher.findFirst({
      where: {
        NOT: { id: data.id },
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (conflictingTeacher) {
      if (conflictingTeacher.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (data.email && conflictingTeacher.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
        };
      }
      if (data.phone && conflictingTeacher.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
    }

    // Update user in Clerk with timeout
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

    const dbOperation = prisma.teacher.update({
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
        birthday: data.birthday,
        subjects: {
          set:
            data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })) || [],
        },
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
    console.error("Full error:", err);
    console.error("Error details:", err.errors);

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
      message: err.errors?.[0]?.message || "Failed to create teacher",
    };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const queryOperation = prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
            classes: true, // supervising classes
            subjects: true, // teaching subjects
          },
        },
        subjects: {
          select: { id: true, name: true },
        },
        classes: {
          select: { id: true, name: true },
        },
      },
    });

    const teacherWithRelated = (await Promise.race([
      queryOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 15000)
      ),
    ])) as any;

    if (!teacherWithRelated) {
      return {
        success: false,
        error: true,
        message: "Teacher not found!",
      };
    }

    const { lessons, classes, subjects } = teacherWithRelated._count;

    if (lessons > 0 || classes > 0 || subjects > 0) {
      let details = [];
      if (lessons > 0) details.push(`${lessons} lesson(s)`);
      if (classes > 0) details.push(`supervises ${classes} class(es)`);
      if (subjects > 0) details.push(`teaches ${subjects} subject(s)`);

      return {
        success: false,
        error: true,
        message: `Cannot delete teacher. They have ${details.join(
          ", "
        )}. Please reassign these first.`,
      };
    }

    const clerk = await clerkClient();
    const clerkDeleteOperation = clerk.users.deleteUser(id);

    await Promise.race([
      clerkDeleteOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk deletion timeout")), 20000)
      ),
    ]);

    const dbDeleteOperation = prisma.teacher.delete({
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
    console.error("Teacher deletion error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete teacher. Please try again.",
    };
  }
};
