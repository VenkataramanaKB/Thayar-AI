import { useParams } from "react-router-dom";

function ListDetail() {
  const { id } = useParams();

  return (
    <div className="text-center mt-10">
      <h1 className="text-3xl font-semibold text-gray-700">List Details</h1>
      <p className="mt-2 text-gray-500">Viewing list ID: {id}</p>
    </div>
  );
}

export default ListDetail;
