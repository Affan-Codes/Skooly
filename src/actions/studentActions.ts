"use server";

import { StudentSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs/server";

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    // Convert string IDs to numbers
    // const gradeId =
    //   typeof data.gradeId === "string" ? parseInt(data.gradeId) : data.gradeId;
    // const classId =
    //   typeof data.classId === "string" ? parseInt(data.classId) : data.classId;

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
    const user = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });

    // Create student in database
    await prisma.student.create({
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

    return { success: true, error: false };
  } catch (err: any) {
    console.error("Create student error:", err);

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

    await clerk.users.updateUser(data.id, updateData);

    // Update student in database
    const studentUpdateData: any = {
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
    };

    await prisma.student.update({
      where: { id: data.id },
      data: studentUpdateData,
    });

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
    const studentWithRelated = await prisma.student.findUnique({
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
    await clerk.users.deleteUser(id);

    // Then delete from database
    await prisma.student.delete({
      where: { id },
    });

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
