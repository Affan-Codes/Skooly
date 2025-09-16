"use server";

import {
  AnnouncementSchema,
  announcementSchema,
} from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    const validatedData = announcementSchema.parse(data);

    await prisma.announcement.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        classId: validatedData.classId || null,
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error creating announcement:", error);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    const validatedData = announcementSchema.parse(data);

    if (!validatedData.id) {
      throw new Error("Announcement ID is required for update");
    }

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingAnnouncement) {
      throw new Error("Announcement not found");
    }

    await prisma.announcement.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        classId: validatedData.classId || null,
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error updating announcement:", error);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    if (!id) {
      throw new Error("Announcement ID is required");
    }

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAnnouncement) {
      throw new Error("Announcement not found");
    }

    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, error: true };
  }
};
