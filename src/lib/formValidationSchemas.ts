import { z } from "zod";
import { Day } from "@prisma/client";

// SUBJECT

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()),
});
export type SubjectSchema = z.infer<typeof subjectSchema>;

// CLASS

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  supervisorId: z.coerce.string().optional(),
});
export type ClassSchema = z.infer<typeof classSchema>;

// TEACHER

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(),
});
export type TeacherSchema = z.infer<typeof teacherSchema>;

// STUDENT

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(1, "Username is required!"),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, "First name is required!"),
  surname: z.string().min(1, "Last name is required!"),
  email: z.string().email("Invalid email!").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required!"),
  img: z.string().optional(),
  bloodType: z.string().min(1, "Blood type is required!"),
  sex: z.enum(["MALE", "FEMALE"]),
  birthday: z.string().min(1, "Birthday is required!"), // Changed to string
  gradeId: z.string().min(1, "Grade is required!"), // Changed to string
  classId: z.string().min(1, "Class is required!"), // Changed to string
  parentId: z.string().min(1, "Parent is required!"),
});
export type StudentSchema = z.infer<typeof studentSchema>;

// EXAM

export const examSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().min(1, { message: "Exam name is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    lessonId: z.coerce.number({ message: "Lesson is required!" }),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time!",
    path: ["endTime"],
  });
export type ExamSchema = z.infer<typeof examSchema>;

// ANNOUNCEMENT

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z
    .string()
    .min(1, { message: "Title is required!" })
    .max(100, { message: "Title too long!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }, z.number().positive().nullable().optional()),
});
export type AnnouncementSchema = z.infer<typeof announcementSchema>;

// EVENT

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined || val === "0") {
      return null;
    }
    return Number(val);
  }, z.number().positive().nullable().optional()),
});
export type EventSchema = z.infer<typeof eventSchema>;

// ASSIGNMENT

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Assignment title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});
export type AssignmentSchema = z.infer<typeof assignmentSchema>;

// LESSON

export const lessonSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Lesson name is required!" }),
    day: z.enum(Day, { message: "Day is required!" }),
    startTime: z.string().min(1, { message: "Start time is required!" }),
    endTime: z.string().min(1, { message: "End time is required!" }),
    subjectId: z.string().min(1, { message: "Subject is required!" }),
    classId: z.string().min(1, { message: "Class is required!" }),
    teacherId: z.string().min(1, { message: "Teacher is required!" }),
  })
  .refine(
    (data) => {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      return endTime > startTime;
    },
    {
      message: "End time must be after start time!",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      // Check if both times are on the same day
      const startDate = startTime.toDateString();
      const endDate = endTime.toDateString();

      return startDate === endDate;
    },
    {
      message: "Start and end time must be on the same day!",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      // Check if start time is between 8 AM (08:00) and 5 PM (17:00)
      const startHour = startTime.getHours();
      const endHour = endTime.getHours();
      const endMinutes = endTime.getMinutes();

      // End time can be exactly 17:00 (5 PM) but not after
      const isValidStart = startHour >= 8 && startHour < 17;
      const isValidEnd = endHour < 17 || (endHour === 17 && endMinutes === 0);

      return isValidStart && isValidEnd;
    },
    {
      message: "Lessons must be scheduled between 8:00 AM and 5:00 PM!",
      path: ["startTime"],
    }
  );
export type LessonSchema = z.infer<typeof lessonSchema>;

// RESULT

export const resultSchema = z
  .object({
    id: z.number().optional(),
    score: z
      .union([z.string().min(1, "Score is required!"), z.number()])
      .refine((val) => {
        const num = typeof val === "string" ? parseInt(val) : val;
        return !isNaN(num) && num >= 0 && num <= 100;
      }, "Score must be between 0 and 100!"),
    studentId: z.string().min(1, "Student is required!"),
    examId: z.union([z.string(), z.number()]).optional().nullable(),
    assignmentId: z.union([z.string(), z.number()]).optional().nullable(),
  })
  .refine(
    (data) => {
      const hasExam = data.examId && data.examId !== "" && data.examId !== null;
      const hasAssignment =
        data.assignmentId &&
        data.assignmentId !== "" &&
        data.assignmentId !== null;

      // Either exam or assignment must be selected, but not both
      return (hasExam && !hasAssignment) || (!hasExam && hasAssignment);
    },
    {
      message: "Please select either an exam or an assignment, but not both!",
      path: ["examId"], // This will show the error on the exam field
    }
  );
export type ResultSchema = z.infer<typeof resultSchema>;

// PARENT

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters!"),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, "First name is required!"),
  surname: z.string().min(1, "Last name is required!"),
  email: z
    .union([z.string().email("Invalid email format!"), z.string().length(0)])
    .optional()
    .nullable(),
  phone: z.string().min(1, "Phone number is required!"),
  address: z.string().min(1, "Address is required!"),
});
export type ParentSchema = z.infer<typeof parentSchema>;
