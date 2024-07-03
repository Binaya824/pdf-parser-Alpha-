/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import AceEditor from "react-ace";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Loader2, Loader2Icon } from "lucide-react";
import ReactJson from "react-json-view";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ScrollArea } from "./components/ui/scroll-area";
import io from 'socket.io-client';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { Progress } from "@material-tailwind/react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Textarea } from "./components/ui/textarea";
import useWebSocket, { ReadyState } from 'react-use-websocket';


import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

import JSONInput from "react-json-editor-ajrm";
import locale from "react-json-editor-ajrm/locale/en";

// import { useState } from 'react'
function App() {
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState<boolean>(false);
  const [clauses, setClauses] = useState({});
  const [clause, setClause] = useState<string>("");
  const [tables, setTables] = useState({});
  const [err, setErr] = useState("");
  const [uploaderLoading, setUploaderLoading] = useState(false);
  const [selectedClauseValue, setSelectedClauseValue] = useState("");
  const [clauseId, setClauseId] = useState("");
  const [tableId, setTableId] = useState("");
  const [content, setContent] = useState("");
  const [updatedTable, setUpdatedValue] = useState("");
  const [documentImages, setDocumentImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [socketUrl, setSocketUrl] = useState('');
  const [messageHistory, setMessageHistory] = useState([]);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files![0]);
  }

  async function handleSubmit() {
    setUploaderLoading(true);
    setClauses({});
    setTables({});
    const fd = new FormData();

    if (!file) {
      toast.error("Please select a file before trying ...");
      return;
    }

    fd.append("file", file);

    try {
      const res = await axios.post("http://localhost:5050/api/v1/upload", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Document uploaded successfully");

      setUploaderLoading(false);

      setLoading(true);
      
      setDocumentImages(res.data?.data?.outputArray?.response)
    } catch (err) {      
      toast.error(
        err?.response.data.message || "Something went wrong, please try again later"
      );
      setLoading(false);
      setUploaderLoading(false);
    }
  }

  useEffect(() => {
    if (clause !== "" && clauses) {
      const key = Object.keys(clauses).filter((key) => key === clause);
      const value = key.map((k) => clauses[k])[0];

      setSelectedClauseValue(value);
    }
  }, [clause]);

  const handleUpdate = async () => {
    await axios.patch(
      `http://localhost:5050/api/v1/pdf/${clauseId}?clause=${clause}`,
      {
        content: content,
      }
    );

    const res = await axios.get(`http://localhost:5050/api/v1/pdf/${clauseId}`);

    console.log(res.data);

    setClauses(res.data.pdf.data);
    // setClauseId(res?.data?.data.clauses.id);
    // setTableId(res?.data?.data.clauses.tableId);
    // setTables(res.data?.table?.data);
  };

  function handleTableChange(newValue) {
    console.log(newValue);
    setUpdatedValue(newValue);
  }

  async function handleTableUpdate() {
    // console.log(JSON.parse(updatedTable));

    await axios.patch(`http://localhost:5050/api/v1/pdf/${clauseId}`, {
      tableContent: updatedTable,
    });

    const res = await axios.get(`http://localhost:5050/api/v1/pdf/${clauseId}`);

    console.log(res.data);

    setClauses(res.data.pdf.data);
    // setClauseId(res?.data?.data.clauses.id);
    // setTableId(res?.data?.data.clauses.tableId);
    // setTables(res.data?.table?.data);
  }
  useEffect(() => {
    if (documentImages.length != 0) {
      setSocketUrl('ws://localhost:8080');

      const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
      }[readyState];

      if(readyState == 0){
        sendMessage(JSON.stringify(documentImages));
      }
      console.log(connectionStatus)
     
    }
  }, [documentImages]);

  useEffect(()=>{

    if(lastMessage != null){
        // console.log('last_messages', lastMessage)
        const jsonMesasges = JSON.parse(lastMessage?.data);
        
        if(jsonMesasges?.type == "progress_data"){
          setClauses(jsonMesasges?.data)
        }

        if(jsonMesasges?.type == "table_progress"){
          console.log({jsonMesasges})
        }

        if(jsonMesasges?.type == 'progress'){
          // progress
          setProgress(parseFloat(jsonMesasges.progress))
        }
        if(jsonMesasges?.type == 'task_completed'){
          toast.success(jsonMesasges?.message)
        }
        if(jsonMesasges?.type == 'new_task_started'){
          toast.success(jsonMesasges?.message)

        }

        if(jsonMesasges.status == 'success'){
          setLoading(false);
          const data = jsonMesasges.data
          setClauses(data?.clauses?.data);
          setClauseId(data.clauses.id);
          setTableId(data.clauses.tableId);
          setTables(data?.tables?.data);
        }
    }

  },[lastMessage])


  return (
    <>
      <div className="grid w-screen h-screen place-content-center items-center gap-4">
        <div className="items-center gap-1.5">
          <Label htmlFor="doc">Upload Your Document</Label>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input
              id="doc"
              type="file"
              onChange={handleFileChange}
              accept="application/pdf"
            />
            <Button
              type="submit"
              disabled={uploaderLoading}
              onClick={handleSubmit}
            >
              {uploaderLoading && (
                <>
                  <Loader2 height={20} width={20} className="animate-spin" />
                </>
              )}{" "}
              Upload
            </Button>
          </div>
        </div>
        {err && <h1>{err}</h1>}
        {loading && !Object.keys(clauses).length ? (
          <div className="grid border-2 min-h-[250px] rounded-md border-border place-content-center items-center gap-1.5">
            <Loader2Icon height={20} width={20} className="animate-spin" />
          </div>
        ) : <div className="flex items-center gap-4 justify-center">
        {Object.keys(clauses).length ? (
          <div className="grid border-2 min-h-[500px] w-[500px] rounded-md border-border place-content-center overflow-auto items-center gap-1.5">
            <Select onValueChange={(value) => setClause(value)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select the clause no." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Clauses</SelectLabel>
                  <ScrollArea className="h-[200px] w-[200px]">
                    {Object.keys(clauses).map((key) => (
                      <SelectItem value={key} key={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{clause}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] w-[250px]">
                    <p className="text-sm">{selectedClauseValue}</p>
                  </ScrollArea>
                </CardContent>
                <CardFooter>
                  <Dialog
                    onOpenChange={(open) =>
                      !open ? setContent("") : setContent(selectedClauseValue)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button>Edit</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit clause {clause}</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        value={content ?? selectedClauseValue}
                      />
                      <DialogFooter>
                        <Button onClick={handleUpdate} type="submit">
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </div>
            {/* <ReactJson
              src={clauses}
              style={{
                height: "500px",
                width: "500px",
              }}
            /> */}
          </div>
        ) : null}
        {Object.keys(tables).length ? (
          <div className="grid border-2 min-h-[250px] rounded-md border-border place-content-center relative overflow-auto items-center gap-1.5">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-max my-2 ml-2">Edit</Button>
              </DialogTrigger>
              <DialogContent className="w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Table</DialogTitle>
                </DialogHeader>
                <AceEditor
                  mode="json"
                  theme="github"
                  onChange={handleTableChange}
                  value={
                    updatedTable == "" ? JSON.stringify(tables) : updatedTable
                  }
                  wrapEnabled={true}
                />
                {/* <JSONInput
                  id="a_unique_id"
                  placeholder={tables}
                  // colors={"darktheme"}
                  locale={locale}
                  height="550px"
                  onChange={handleTableChange}
                /> */}
                <DialogFooter>
                  <Button onClick={handleTableUpdate} type="submit">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ReactJson
              src={tables}
              style={{
                height: "500px",
                width: "500px",
              }}
            />
          </div>
        ) : null}
      </div>}
        {loading && (<Progress value={progress} label="Completed" />)}
      </div>
      <ToastContainer />
    </>
  );
}

function Table({ data }: { data: unknown }) {
  // console.log({data})

  const pageNumbers = useMemo(
    () => Object.keys(data)?.map((pageKey) => data[pageKey]?.page),
    [data]
  );

  const [page, setPage] = useState<number | undefined>();
  const [pageData, setPageData] = useState([]);

  useEffect(() => {
    setPage(pageNumbers[0]);
  }, [pageNumbers]);

  function handlePageChange(selectedPage: number) {
    setPage(selectedPage);
  }

  useEffect(() => {
    // console.log("Runnning ...", page);
    const d = Object.values(data).filter((d) => d?.page === page);
    setPageData(d);
  }, [data, page]);

  return (
    <div className="min-h-[500px] max-h-[500px] max-w-[500px] grid border-2 rounded-md border-border overflow-auto">
      <div className="mb-4 flex justify-center mt-2">
        <Select
          onValueChange={handlePageChange}
          className=""
          value={page} // Use value prop to control the selected page
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {pageNumbers?.map((pageNumber) => (
              <SelectItem key={pageNumber} value={pageNumber}>
                Page {pageNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {page &&
        pageData?.map((data) => <TableElement key={data?.page} data={data} />)}
    </div>
  );
}

function TableElement({ data }) {
  if (!data || !data.tables || data.tables.length === 0) {
    return null; // Handle empty or missing data
  }

  const columnHeaders = useMemo(() => data.tables[0], [data.tables]);
  const tableData = useMemo(() => {
    const newData = [...data.tables];
    newData.shift();
    return newData;
  }, [data.tables]);

  // console.log(columnHeaders);

  return (
    <div className="overflow-x-auto overflow-y-auto">
      <table className="table-auto min-w-full">
        <thead>
          <tr>
            {columnHeaders?.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row?.map((cell, cellIndex) => (
                <td
                  className="min-w-[250px] text-sm border-b-2 border-border text-center py-4"
                  key={cellIndex}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
