"use server";

import { ParentSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs/server";

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    // Create user in Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "parent" },
    });

    // Create parent in database
    await prisma.parent.create({
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

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create parent error:", err);

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

    await clerk.users.updateUser(data.id, updateData);

    // Update parent in database
    await prisma.parent.update({
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
    const parentWithStudents = await prisma.parent.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!parentWithStudents) {
      return {
        success: false,
        error: true,
        message: "Parent not found!",
      };
    }

    if (parentWithStudents._count.students > 0) {
      return {
        success: false,
        error: true,
        message: `Cannot delete parent. They have ${parentWithStudents._count.students} student(s) registered. Please transfer or remove students first.`,
      };
    }

    // Delete from Clerk first
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);

    // Then delete from database
    await prisma.parent.delete({
      where: { id },
    });

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
