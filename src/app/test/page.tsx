'use client'

import { useFormStatus } from "react-dom"



export default function Test() {
    const { pending } = useFormStatus();

    return (
        <>
        <button type="submit" disabled={pending}>

        </button>
        </>
    )
}
