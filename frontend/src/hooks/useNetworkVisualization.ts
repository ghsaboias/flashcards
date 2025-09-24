import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { domainColors } from '../constants/network-colors'

// D3 types for force simulation
type SimulationNodeDatum = d3.SimulationNodeDatum
type SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> = d3.SimulationLinkDatum<NodeDatum>
type Selection<GElement extends d3.BaseType, Datum, PElement extends d3.BaseType, PDatum> = d3.Selection<GElement, Datum, PElement, PDatum>

interface NetworkNode extends SimulationNodeDatum {
  id: string
  char: string
  traditional?: string
  pinyin: string
  pos?: string
  tone?: number
  semantic_domain: string
  radical?: string | null
  frequency?: number
  hub_score: number
  cluster_role: 'anchor' | 'branch' | 'leaf'
  type: 'character'
}

interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode
  target: string | NetworkNode
  type: 'semantic' | 'radical' | 'compound' | 'phonetic'
  strength: number
}

interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

interface TooltipData {
  x: number
  y: number
  node: NetworkNode
}

export function useNetworkVisualization(
  filteredData: NetworkData | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  setTooltip: React.Dispatch<React.SetStateAction<TooltipData | null>>
) {
  const svgRef = useRef<SVGSVGElement>(null)

  // D3 visualization effect
  useEffect(() => {
    if (!filteredData || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear previous content
    svg.selectAll('*').remove()

    // Set up SVG
    svg.attr('width', width).attr('height', height)

    // Create container first
    const svgContainer = svg.append('g')

    // Create zoom behavior - match HTML exactly
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', function(event) {
        svgContainer.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create simulation - exact match to HTML parameters
    const simulation = d3.forceSimulation(filteredData.nodes)
      .force('link', d3.forceLink(filteredData.links).id((d: any) => d.id).distance(d => {
        // Different distances for different link types - match HTML
        switch(d.type) {
          case 'semantic': return 50;
          case 'radical': return 40;
          case 'compound': return 30;
          default: return 50;
        }
      }).strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(15))

    // Create links
    const links = svgContainer.append('g')
      .selectAll('line')
      .data(filteredData.links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', (d: NetworkLink) => {
        // Match HTML color scheme exactly
        switch(d.type) {
          case 'semantic': return '#4fc3f7'
          case 'radical': return '#81c784'
          case 'compound': return '#ffb74d'
          default: return '#666'
        }
      })
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', (d: NetworkLink) => Math.sqrt((d.strength || 1) * 3)) // Match HTML: strength * 3

    // Create nodes
    const nodes = svgContainer.append('g')
      .selectAll('g')
      .data(filteredData.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

    // Add circles to nodes - exact match to HTML
    nodes.append('circle')
      .attr('r', (d: NetworkNode) => Math.sqrt(d.frequency || d.hub_score * 10) * 3 + 5) // Match HTML: frequency-based sizing
      .attr('fill', (d: NetworkNode) => domainColors[d.semantic_domain as keyof typeof domainColors] || '#666') // Use exact HTML colors
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)

    // Add text to nodes
    nodes.append('text')
      .text((d: NetworkNode) => d.char)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')

    // Helper function for highlighting connections
    function highlightConnections(
      selectedNode: NetworkNode,
      nodeSelection: Selection<SVGGElement, NetworkNode, SVGGElement, unknown>,
      linkSelection: Selection<SVGLineElement, NetworkLink, SVGGElement, unknown>
    ) {
      // Reset all highlighting
      nodeSelection.classed('highlighted', false)
      linkSelection.classed('highlighted', false)

      // Highlight selected node
      nodeSelection.filter((n: NetworkNode) => n.id === selectedNode.id)
        .classed('highlighted', true)

      // Get connected nodes and links
      const connectedNodes = new Set([selectedNode.id])
      const connectedLinks = filteredData!.links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : (l.source as NetworkNode).id
        const targetId = typeof l.target === 'string' ? l.target : (l.target as NetworkNode).id
        return sourceId === selectedNode.id || targetId === selectedNode.id
      })

      connectedLinks.forEach(l => {
        const sourceId = typeof l.source === 'string' ? l.source : (l.source as NetworkNode).id
        const targetId = typeof l.target === 'string' ? l.target : (l.target as NetworkNode).id
        connectedNodes.add(sourceId)
        connectedNodes.add(targetId)
      })

      // Highlight connected elements
      nodeSelection.classed('highlighted', (n: NetworkNode) => connectedNodes.has(n.id))
      linkSelection.classed('highlighted', (l: NetworkLink) => {
        const sourceId = typeof l.source === 'string' ? l.source : l.source.id
        const targetId = typeof l.target === 'string' ? l.target : l.target.id
        return sourceId === selectedNode.id || targetId === selectedNode.id
      })
    }

    // Add mouse events - match HTML behavior exactly
    nodes
      .on('mouseover', function(event: MouseEvent, d: NetworkNode) {
        // Show tooltip
        setTooltip({
          x: event.pageX + 10,
          y: event.pageY - 10,
          node: d as NetworkNode
        })
      })
      .on('mousemove', function(event: MouseEvent) {
        setTooltip(prev => prev ? {
          ...prev,
          x: event.pageX + 10,
          y: event.pageY - 10
        } : null)
      })
      .on('mouseout', function() {
        // Hide tooltip
        setTooltip(null)
      })
      .on('click', function(_event: MouseEvent, d: NetworkNode) {
        // Highlight connections on click - match HTML
        highlightConnections(d as NetworkNode, nodes, links)
      })

    // Add drag behavior
    const drag = d3.drag<SVGGElement, NetworkNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodes.call(drag)

    // Update positions on each tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: NetworkLink) => (d.source as NetworkNode).x || 0)
        .attr('y1', (d: NetworkLink) => (d.source as NetworkNode).y || 0)
        .attr('x2', (d: NetworkLink) => (d.target as NetworkNode).x || 0)
        .attr('y2', (d: NetworkLink) => (d.target as NetworkNode).y || 0)

      nodes
        .attr('transform', (d: NetworkNode) => `translate(${d.x},${d.y})`)
    })

    // Handle window resize - match HTML
    const handleResize = () => {
      const newWidth = containerRef.current?.clientWidth || width
      const newHeight = containerRef.current?.clientHeight || height
      svg.attr('width', newWidth).attr('height', newHeight)
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2))
      simulation.alpha(0.3).restart()
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [filteredData, setTooltip, containerRef])

  return { svgRef }
}