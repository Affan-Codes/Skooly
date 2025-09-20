"use server";

import { ParentSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs/server";

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  let clerkUserId: string | null = null;

  try {
    const existingParent = await prisma.parent.findFirst({
      where: {
        OR: [
          { username: data.username },
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existingParent) {
      if (existingParent.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (existingParent.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
      if (data.email && existingParent.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
        };
      }
    }

    // Create user in Clerk
    const clerk = await clerkClient();
    const clerkOperation = clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "parent" },
    });
    const user = (await Promise.race([
      clerkOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Clerk operation timeout")), 20000)
      ),
    ])) as any;

    clerkUserId = user.id;
    console.log("Clerk user created successfully:", user.id);

    const dbOperation = prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
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
    console.error("Create parent error:", err);

    // If Clerk user was created but DB operation failed, clean up
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
        // Log this for manual cleanup if needed
        console.error(
          "MANUAL CLEANUP REQUIRED - Orphaned Clerk user:",
          clerkUserId
        );
      }
    }

    // Handle specific Clerk errors
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

    if (err.code === "P2002" && err.meta?.target?.includes("phone")) {
      return {
        success: false,
        error: true,
        message:
          "Phone number is already registered. Please use a different phone number.",
      };
    }

    return {
      success: false,
      error: true,
      message:
        err.errors?.[0]?.message ||
        "Failed to create parent. Please try again.",
    };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Parent ID is required for update!",
    };
  }

  try {
    // Check if parent exists
    const existingParent = await prisma.parent.findUnique({
      where: { id: data.id },
      select: { id: true, name: true, surname: true },
    });

    if (!existingParent) {
      return {
        success: false,
        error: true,
        message: "Parent not found!",
      };
    }

    // Check for conflicts with other parents
    const conflictingParent = await prisma.parent.findFirst({
      where: {
        NOT: { id: data.id },
        OR: [
          { username: data.username },
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (conflictingParent) {
      if (conflictingParent.username === data.username) {
        return {
          success: false,
          error: true,
          message:
            "Username already exists. Please choose a different username.",
        };
      }
      if (conflictingParent.phone === data.phone) {
        return {
          success: false,
          error: true,
          message:
            "Phone number is already registered. Please use a different phone number.",
        };
      }
      if (data.email && conflictingParent.email === data.email) {
        return {
          success: false,
          error: true,
          message: "Email is already registered. Please use a different email.",
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

    const dbOperation = prisma.parent.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
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
    console.error("Update parent error:", err);

    // Handle specific Clerk errors
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

    if (err.code === "P2002" && err.meta?.target?.includes("phone")) {
      return {
        success: false,
        error: true,
        message:
          "Phone number is already registered. Please use a different phone number.",
      };
    }

    return {
      success: false,
      error: true,
      message:
        err.errors?.[0]?.message ||
        "Failed to update parent. Please try again.",
    };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    // Check if parent has students
    const queryOperation = prisma.parent.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
        students: {
          select: { id: true, name: true, surname: true },
        },
      },
    });

    const parentWithStudents = (await Promise.race([
      queryOperation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 15000)
      ),
    ])) as any;

    if (!parentWithStudents) {
      return {
        success: false,
        error: true,
        message: "Parent not found!",
      };
    }

    if (parentWithStudents._count.students > 0) {
      const studentNames = parentWithStudents.students
        .map((s: any) => `${s.name} ${s.surname}`)
        .join(", ");

      return {
        success: false,
        error: true,
        message: `Cannot delete parent. They have ${parentWithStudents._count.students} student(s) registered: ${studentNames}. Please transfer or remove students first.`,
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
    const dbDeleteOperation = prisma.parent.delete({
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
    console.error("Delete parent error:", err);
    return {
      success: false,
      error: true,
      message: "Failed to delete parent. Please try again.",
    };
  }
};
