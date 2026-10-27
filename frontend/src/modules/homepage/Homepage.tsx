import { blockRegistry } from './blockRegistry';
import type { HomepageBlockConfig, HomepageData } from './types';

interface HomepageProps {
    blocks: HomepageBlockConfig[];
    data: HomepageData;
}

export function Homepage({ blocks, data }: HomepageProps) {
    return (
        <div className="homepage" data-testid="homepage">
            {blocks.map((block) => {
                const Component = blockRegistry[block.type];
                if (!Component) return null;
                return (
                    <Component
                        key={block.id}
                        data={data}
                        config={block.props}
                    />
                );
            })}
        </div>
    );
}
