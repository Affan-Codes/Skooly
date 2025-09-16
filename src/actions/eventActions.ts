"use server";

import { eventSchema, EventSchema } from "@/lib/formValidationSchemas";
import prisma from "@/lib/prisma";
import { CurrentState } from "@/lib/utils";

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    const validatedData = eventSchema.parse(data);

    if (validatedData.endTime <= validatedData.startTime) {
      console.error("End time must be after start time");
      return { success: false, error: true };
    }

    await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        classId: validatedData.classId || null,
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    const validatedData = eventSchema.parse(data);

    if (!validatedData.id) {
      throw new Error("Event ID is required for update");
    }

    if (validatedData.endTime <= validatedData.startTime) {
      console.error("End time must be after start time");
      return { success: false, error: true };
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingEvent) {
      throw new Error("Event not found");
    }

    await prisma.event.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        classId: validatedData.classId || null,
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error updating event:", error);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    if (!id) {
      throw new Error("Event ID is required");
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEvent) {
      throw new Error("Event not found");
    }

    await prisma.event.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false, error: true };
  }
};
