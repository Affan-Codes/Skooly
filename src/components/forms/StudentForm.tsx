"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { createStudent, updateStudent } from "@/actions/studentActions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";

const StudentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema) as Resolver<StudentSchema>,
    defaultValues: {
      id: data?.id,
      username: data?.username || "",
      name: data?.name || "",
      surname: data?.surname || "",
      email: data?.email || "",
      phone: data?.phone || "",
      address: data?.address || "",
      img: data?.img || "",
      bloodType: data?.bloodType || "",
      sex: data?.sex || "MALE",
      birthday: data?.birthday
        ? new Date(data.birthday).toISOString().split('T')[0]
        : "",
      gradeId: data?.gradeId?.toString() || "",
      classId: data?.classId?.toString() || "",
      parentId: data?.parentId || "",
      password: type === "create" ? "" : "", // Only required for create
    },
  });

  const [img, setImg] = useState<any>();

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    StudentSchema
  >(type === "create" ? createStudent : updateStudent, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction({ ...formData, img: img?.secure_url || data.img });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Student has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      if (state.message) {
        toast.error(state.message);
      } else {
        toast.error("Something went wrong!");
      }
    }
  }, [state, router, type, setOpen]);

  const { grades, classes, parents } = relatedData || {};

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new student" : "Update the student" }
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex flex-wrap gap-4 justify-between">
        <InputField
          label="Username"
          name="username"
          register={ register }
          error={ errors.username }
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          register={ register }
          error={ errors.email }
        />
        <InputField
          label={ type === "create" ? "Password" : "Password (leave empty to keep current)" }
          name="password"
          type="password"
          register={ register }
          error={ errors.password }
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>
      <div className="flex flex-col gap-1">
        { (img?.secure_url || data?.img) && (
          <div className="flex items-center gap-2">
            <Image
              src={ img?.secure_url || data.img }
              alt="Student photo"
              width={ 60 }
              height={ 60 }
              className="rounded-full object-cover"
            />
            <span className="text-xs text-gray-500">Current photo</span>
          </div>
        ) }

        <CldUploadWidget
          uploadPreset="skooly"
          onSuccess={ (result, { widget }) => {
            setImg(result.info);
            widget.close();
          } }
        >
          { ({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={ () => open() }
              >
                <Image src="/upload.png" alt="" height={ 28 } width={ 28 } />
                <span>Upload a photo</span>
              </div>
            );
          } }
        </CldUploadWidget>
      </div>
      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="First Name"
          name="name"
          register={ register }
          error={ errors.name }
        />
        <InputField
          label="Last Name"
          name="surname"
          register={ register }
          error={ errors.surname }
        />
        <InputField
          label="Phone"
          name="phone"
          register={ register }
          error={ errors.phone }
        />
        <InputField
          label="Address"
          name="address"
          register={ register }
          error={ errors.address }
        />
        <InputField
          label="Blood Type"
          name="bloodType"
          register={ register }
          error={ errors.bloodType }
        />
        <InputField
          label="Birthday"
          name="birthday"
          register={ register }
          error={ errors.birthday }
          type="date"
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Parent</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("parentId") }
          >
            <option value="">Select a parent</option>
            { parents?.map((parent: { id: string; name: string; surname: string; }) => (
              <option key={ parent.id } value={ parent.id }>
                { parent.name } { parent.surname }
              </option>
            )) }
          </select>
          { errors.parentId?.message && (
            <p className="text-xs text-red-400">
              { errors.parentId.message.toString() }
            </p>
          ) }
        </div>
        { data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={ data?.id }
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("sex") }
            defaultValue={ data?.sex }
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          { errors.sex?.message && (
            <p className="text-xs text-red-400">
              { errors.sex.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Grade</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("gradeId") }
          >
            <option value="">Select a grade</option>
            { grades?.map((grade: { id: number; level: number; }) => (
              <option key={ grade.id } value={ grade.id.toString() }>
                Grade { grade.level }
              </option>
            )) }
          </select>
          { errors.gradeId?.message && (
            <p className="text-xs text-red-400">
              { errors.gradeId.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("classId") }
          >
            <option value="">Select a class</option>
            { classes?.map((classItem: {
              id: number;
              name: string;
              capacity: number;
              _count: { students: number; };
              grade: { level: number; };
            }) => (
              <option key={ classItem.id } value={ classItem.id.toString() }>
                { classItem.name } (Grade { classItem.grade.level }) - { classItem._count.students }/{ classItem.capacity }
              </option>
            )) }
          </select>
          { errors.classId?.message && (
            <p className="text-xs text-red-400">
              { errors.classId.message.toString() }
            </p>
          ) }
        </div>
      </div>
      { state.error && (
        <span className="text-red-500">
          { state.message || "Something went wrong!" }
        </span>
      ) }

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
        >
          { type === "create" ? "Create" : "Update" }
        </button>

        { type === "create" && (
          <button
            type="button"
            onClick={ () => reset() }
            className="bg-gray-400 text-white p-2 rounded-md hover:bg-gray-500 transition-colors"
          >
            Reset
          </button>
        ) }
      </div>
    </form>
  );
};

export default StudentForm;
