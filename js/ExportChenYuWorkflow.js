import { app } from "../../scripts/app.js";

const ext = {
  name: "ExportChenYuWorkflow",
  async init(app) {
    function saveToFile(content, filename) {
      const blob = new Blob([content], { type: "text/plain" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";

      document.body.appendChild(a);

      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    }

    const exportButton = document.createElement("button");
    exportButton.textContent = "导出晨羽工作流";
    exportButton.onclick = async function () {
      try {
        const { output: prompt, workflow } = await app.graphToPrompt();

        const { links, nodes } = workflow;
        const inputs = nodes
          .filter(
            (node) => node.type === "PrimitiveNode" && node.outputs[0].links
          )
          .map((node) => {
            const targets = node.outputs[0].links.map(
              (link_id) =>
                links.find(
                  (link) => link[0] === link_id && link[1] === node.id
                )[3]
            );
            targets.sort();

            const widget = app.graph._nodes_by_id[node.id].widgets[0];
            const input = {
              id: node.id,
              type: node.outputs[0].type,
              name: node.outputs[0].widget.name,
              value: node.widgets_values[0],
              widget: widget.type,
              label: node.title,
              targets,
            };
            switch (input.widget) {
              case "number":
              case "combo":
                input.options = widget.options;
                break;
            }
            const a = targets.map((node_id) =>
              nodes.find((n) => n.id === node_id)
            );
            if (a.find((n) => n.type === "LoadImage")) {
              if (input.widget !== "combo") throw input;
              input.widget = "image";
            }
            if (a.find((n) => n.type === "LoadAudio")) {
              if (input.widget !== "combo") throw input;
              input.widget = "audio";
            }
            return input;
          });

        const outputs = [];
        for (const n of nodes) {
          if (n.type === "SaveImage" || n.type === "SaveAudio") {
            outputs.push({ id: n.id, type: n.type });
          }
        }

        inputs.sort((a, b) => a.id - b.id);
        outputs.sort((a, b) => a.id - b.id);

        if (inputs.length === 0) {
          alert("晨羽工作流导出失败：没有输入！");
        } else if (outputs.length === 0) {
          alert("晨羽工作流导出失败：没有输出！");
        } else {
          saveToFile(
            JSON.stringify({
              version: 1,
              inputs,
              outputs,
              comfyui: {
                prompt,
                extra_data: { extra_pnginfo: { workflow } },
              },
            }),
            "chenyu-workflow.json"
          );
        }
      } catch (error) {
        console.error("晨羽工作流导出失败：", error);
        alert("导出晨羽工作流时发生错误！");
      }
    };

    app.ui.menuContainer.appendChild(exportButton);
  },
};

app.registerExtension(ext);
