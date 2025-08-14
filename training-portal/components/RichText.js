import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function RichText({ value, onChange, placeholder }) {
  return (
    <ReactQuill theme="snow" value={value} onChange={onChange} placeholder={placeholder} />
  );
}